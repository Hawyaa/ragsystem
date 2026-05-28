const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { query } = require('../db/postgres');
const { runRAGPipeline } = require('../services/ragPipeline');
const { sendEscalationEmail, sendUserConfirmationEmail } = require('../services/emailService');

router.post('/', async (req, res) => {
  const { message, sessionId: existingSessionId } = req.body;

  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const sessionId = existingSessionId || uuidv4();
  const trimmedMessage = message.trim();

  try {
    await query(`
      INSERT INTO conversations (session_id)
      VALUES ($1)
      ON CONFLICT (session_id) DO UPDATE SET last_message_at = NOW()
    `, [sessionId]);

    const convResult = await query(
      'SELECT id, is_escalated, escalation_reason FROM conversations WHERE session_id = $1',
      [sessionId]
    );
    const conversation = convResult.rows[0];
    const conversationId = conversation.id;

    // ── Detect if user typed email directly in chat ──
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const isEmail = emailRegex.test(trimmedMessage);
    const awaitingEmail = !conversation.is_escalated && conversation.escalation_reason;

    if (isEmail && awaitingEmail) {
      try {
        const historyResult = await query(`
          SELECT role, content, created_at FROM messages
          WHERE conversation_id = $1 ORDER BY created_at ASC
        `, [conversationId]);

        await sendEscalationEmail({
          userEmail: trimmedMessage,
          unansweredQuestion: conversation.escalation_reason,
          conversationHistory: historyResult.rows,
          sessionId,
        });
        await sendUserConfirmationEmail({
          userEmail: trimmedMessage,
          unansweredQuestion: conversation.escalation_reason,
        });

        await query(`
          UPDATE conversations
          SET user_email = $1, is_escalated = TRUE, status = 'escalated', last_message_at = NOW()
          WHERE id = $2
        `, [trimmedMessage, conversationId]);

        await query(`
          INSERT INTO escalations (conversation_id, user_email, reason, unanswered_question, email_sent, email_sent_at)
          VALUES ($1, $2, 'Question outside knowledge base', $3, TRUE, NOW())
        `, [conversationId, trimmedMessage, conversation.escalation_reason]);

        await query(`
          INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)
        `, [conversationId, trimmedMessage]);

        const replyContent = `✅ Perfect! Our team has been notified and a confirmation was sent to **${trimmedMessage}**. You'll hear back within 24 hours. Is there anything else I can help you with?`;

        await query(`
          INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)
        `, [conversationId, replyContent]);

        await query(`
          UPDATE conversations SET message_count = message_count + 2, last_message_at = NOW() WHERE id = $1
        `, [conversationId]);

        return res.json({
          reply: replyContent,
          isOutOfScope: false,
          sessionId,
          confidenceScore: 1.0,
          sourcesUsed: [],
        });
      } catch (emailErr) {
        console.error('[Chat] Email error:', emailErr.message);
      }
    }

    // ── Normal RAG flow ──
    const historyResult = await query(`
      SELECT role, content, created_at FROM messages
      WHERE conversation_id = $1 ORDER BY created_at ASC LIMIT 20
    `, [conversationId]);

    await query(`
      INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'user', $2)
    `, [conversationId, trimmedMessage]);

    const { answer, isOutOfScope, confidenceScore, sourcesUsed } =
      await runRAGPipeline(trimmedMessage, historyResult.rows);

    let replyContent;
    if (isOutOfScope) {
      replyContent = "I'm sorry, I don't have information about that in my knowledge base. To make sure you get the best help, I'd love to connect you with our support team. Could you please share your email address?";
      // Save unanswered question for when they type email in chat
      await query(`
        UPDATE conversations SET escalation_reason = $1 WHERE id = $2
      `, [trimmedMessage, conversationId]);
    } else {
      replyContent = answer;
    }

    await query(`
      INSERT INTO messages (conversation_id, role, content, sources, confidence_score)
      VALUES ($1, 'assistant', $2, $3, $4)
    `, [conversationId, replyContent, JSON.stringify(sourcesUsed), confidenceScore]);

    await query(`
      UPDATE conversations SET message_count = message_count + 2, last_message_at = NOW()
      WHERE id = $1
    `, [conversationId]);

    return res.json({
      reply: replyContent,
      isOutOfScope,
      sessionId,
      confidenceScore,
      sourcesUsed,
    });

  } catch (err) {
    console.error('[Chat] Error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

router.post('/escalate', async (req, res) => {
  const { sessionId, userEmail, unansweredQuestion } = req.body;

  if (!sessionId || !userEmail || !unansweredQuestion) {
    return res.status(400).json({ error: 'sessionId, userEmail, and unansweredQuestion are required' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(userEmail)) {
    return res.status(400).json({ error: 'Invalid email address' });
  }

  try {
    const convResult = await query(
      'SELECT id FROM conversations WHERE session_id = $1',
      [sessionId]
    );

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversationId = convResult.rows[0].id;

    const historyResult = await query(`
      SELECT role, content, created_at FROM messages
      WHERE conversation_id = $1 ORDER BY created_at ASC
    `, [conversationId]);

    await query(`
      UPDATE conversations
      SET user_email = $1, is_escalated = TRUE, status = 'escalated',
          escalation_reason = $2, last_message_at = NOW()
      WHERE id = $3
    `, [userEmail, unansweredQuestion, conversationId]);

    const escalationResult = await query(`
      INSERT INTO escalations (conversation_id, user_email, reason, unanswered_question)
      VALUES ($1, $2, 'Question outside knowledge base', $3)
      RETURNING id
    `, [conversationId, userEmail, unansweredQuestion]);

    const escalationId = escalationResult.rows[0].id;

    try {
      await sendEscalationEmail({
        userEmail,
        unansweredQuestion,
        conversationHistory: historyResult.rows,
        sessionId,
      });
      await sendUserConfirmationEmail({ userEmail, unansweredQuestion });

      await query(`
        UPDATE escalations SET email_sent = TRUE, email_sent_at = NOW() WHERE id = $1
      `, [escalationId]);

      await query(`
        INSERT INTO messages (conversation_id, role, content) VALUES ($1, 'assistant', $2)
      `, [conversationId, `Thank you! I've notified our support team and sent a confirmation to **${userEmail}**. You'll hear back within 24 hours. Is there anything else I can help you with?`]);

    } catch (emailErr) {
      console.error('[Escalation] Email sending failed:', emailErr.message);
    }

    return res.json({
      success: true,
      message: `Escalation recorded. Our team will contact ${userEmail} soon.`,
      escalationId,
    });

  } catch (err) {
    console.error('[Escalate] Error:', err);
    return res.status(500).json({ error: 'Internal server error', details: err.message });
  }
});

module.exports = router;
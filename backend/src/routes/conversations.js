const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../db/postgres');

/**
 * GET /api/conversations
 * List all conversations with pagination.
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    const status = req.query.status; // optional filter

    let whereClause = '';
    const params = [limit, offset];

    if (status) {
      whereClause = 'WHERE c.status = $3';
      params.push(status);
    }

    const result = await query(`
      SELECT
        c.id,
        c.session_id,
        c.user_email,
        c.started_at,
        c.last_message_at,
        c.message_count,
        c.is_escalated,
        c.status,
        c.escalation_reason,
        (SELECT content FROM messages WHERE conversation_id = c.id AND role = 'user' ORDER BY created_at ASC LIMIT 1) AS first_message
      FROM conversations c
      ${whereClause}
      ORDER BY c.last_message_at DESC
      LIMIT $1 OFFSET $2
    `, params);

    const countResult = await query('SELECT COUNT(*) FROM conversations');
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      conversations: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    console.error('[Conversations] Error:', err);
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/conversations/:id
 * Get a single conversation with all messages.
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const convResult = await query(`
      SELECT * FROM conversations WHERE id = $1 OR session_id = $1
    `, [req.params.id]);

    if (convResult.rows.length === 0) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    const conversation = convResult.rows[0];

    const messagesResult = await query(`
      SELECT id, role, content, sources, confidence_score, created_at
      FROM messages
      WHERE conversation_id = $1
      ORDER BY created_at ASC
    `, [conversation.id]);

    return res.json({
      conversation,
      messages: messagesResult.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/conversations/stats/summary
 * Summary stats for the admin dashboard.
 */
router.get('/stats/summary', adminAuth, async (req, res) => {
  try {
    const stats = await query(`
      SELECT
        COUNT(*) AS total_conversations,
        COUNT(*) FILTER (WHERE is_escalated = TRUE) AS escalated,
        COUNT(*) FILTER (WHERE status = 'active') AS active,
        COUNT(*) FILTER (WHERE started_at > NOW() - INTERVAL '24 hours') AS last_24h,
        COALESCE(AVG(message_count), 0) AS avg_messages
      FROM conversations
    `);

    const topQuestions = await query(`
      SELECT content, COUNT(*) as count
      FROM messages
      WHERE role = 'user'
      GROUP BY content
      ORDER BY count DESC
      LIMIT 5
    `);

    return res.json({
      stats: stats.rows[0],
      topQuestions: topQuestions.rows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
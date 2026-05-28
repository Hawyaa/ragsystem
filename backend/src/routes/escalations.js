const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const { query } = require('../db/postgres');

/**
 * GET /api/escalations
 * List all escalations.
 */
router.get('/', adminAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await query(`
      SELECT
        e.id,
        e.user_email,
        e.reason,
        e.unanswered_question,
        e.email_sent,
        e.email_sent_at,
        e.created_at,
        c.session_id,
        c.message_count
      FROM escalations e
      JOIN conversations c ON e.conversation_id = c.id
      ORDER BY e.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);

    const countResult = await query('SELECT COUNT(*) FROM escalations');
    const total = parseInt(countResult.rows[0].count);

    return res.json({
      escalations: result.rows,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/escalations/:id
 * Get a single escalation with conversation.
 */
router.get('/:id', adminAuth, async (req, res) => {
  try {
    const escResult = await query(`
      SELECT e.*, c.session_id, c.message_count, c.started_at
      FROM escalations e
      JOIN conversations c ON e.conversation_id = c.id
      WHERE e.id = $1
    `, [req.params.id]);

    if (escResult.rows.length === 0) {
      return res.status(404).json({ error: 'Escalation not found' });
    }

    const escalation = escResult.rows[0];

    const messagesResult = await query(`
      SELECT role, content, created_at FROM messages
      WHERE conversation_id = (SELECT conversation_id FROM escalations WHERE id = $1)
      ORDER BY created_at ASC
    `, [req.params.id]);

    return res.json({ escalation, messages: messagesResult.rows });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
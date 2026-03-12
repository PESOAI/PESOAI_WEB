// api/routes/logs.js  –  PESO AI
// FIX: added verifyToken protection + system_logs safe-create guard
import express from 'express';
import pool    from '../db.js';
import { verifyToken } from './auth.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// POST /api/logs  —  add a log entry
// ─────────────────────────────────────────────────────────────
router.post('/logs', verifyToken, async (req, res) => {
  const { type, user_name, message } = req.body;
  try {
    await pool.query(
      'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
      [type, user_name, message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[LOG POST ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/logs  —  latest 100 log entries (admin only)
// FIX: was returning 500 because system_logs table didn't exist.
//      Table is now created in db.js initSchema() on startup.
// ─────────────────────────────────────────────────────────────
router.get('/logs', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100'
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('[LOG GET ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/logs  —  clear all logs (Main Admin only)
// ─────────────────────────────────────────────────────────────
router.delete('/logs', verifyToken, async (req, res) => {
  if (req.admin?.role !== 'Main Admin') {
    return res.status(403).json({ message: 'Only Main Admin can clear logs' });
  }
  try {
    await pool.query('DELETE FROM system_logs');
    res.json({ success: true });
  } catch (err) {
    console.error('[LOG DELETE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
import pool from '../config/db.js';
import { HTTP, ROLES, LOG_LIMIT } from '../constants/index.js';

// ── POST /api/logs ────────────────────────────────────────────
export const createLog = async (req, res) => {
  const { type, user_name, message } = req.body;
  try {
    await pool.query(
      'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
      [type, user_name, message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[LOG POST ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── GET /api/logs ─────────────────────────────────────────────
export const getLogs = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT ${LOG_LIMIT}`
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('[LOG GET ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── DELETE /api/logs ──────────────────────────────────────────
export const deleteLogs = async (req, res) => {
  if (req.admin?.role !== ROLES.MAIN_ADMIN)
    return res.status(HTTP.FORBIDDEN).json({ message: 'Only Main Admin can clear logs' });

  try {
    await pool.query('DELETE FROM system_logs');
    res.json({ success: true });
  } catch (err) {
    console.error('[LOG DELETE ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};
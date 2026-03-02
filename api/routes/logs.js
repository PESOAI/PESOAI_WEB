import express from 'express';
import pool from '../db.js';

const router = express.Router();

router.post('/logs', async (req, res) => {
  const { type, user_name, message } = req.body;
  try {
    await pool.query(
      'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
      [type, user_name, message]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[LOG ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/logs', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT 100'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/logs', async (req, res) => {
  try {
    await pool.query('DELETE FROM system_logs');
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
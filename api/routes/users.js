import express from 'express';
import pool from '../db.js';

const router = express.Router();

// --- GET ALL USERS ---
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        user_id,
        full_name,
        join_date,
        email,
        phone_number,
        location_id,
        account_status,
        last_active_at
      FROM users 
      ORDER BY join_date DESC
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[USERS ERROR]', err.message);
    res.json([]);
  }
});

export default router;
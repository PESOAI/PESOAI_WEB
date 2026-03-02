import express from 'express';
import bcrypt from 'bcrypt';
import pool from '../db.js';

const router = express.Router();


router.post('/login', async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      await pool.query(
        'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
        ['FAILED', username, 'Failed login attempt: user not found']
      );
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch) {
      console.log(`[LOGIN] ✅ ${admin.username} (${admin.role})`);
      await pool.query(
        'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
        ['SUCCESS', admin.username, `Authorized access as ${admin.role}`]
      );
      res.json({
        message: 'Login successful',
        user: { id: admin.admin_id, name: admin.username, role: admin.role }
      });
    } else {
      console.log(`[LOGIN] ❌ Failed attempt: ${username}`);
      await pool.query(
        'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
        ['FAILED', username, 'Failed login attempt: wrong password']
      );
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/admins', async (req, res) => {
  const { username, password, role, creatorRole } = req.body;

  if (creatorRole !== 'Main Admin') {
    return res.status(403).json({ message: 'Forbidden: Only Main Admin can create accounts' });
  }
  if (!['Main Admin', 'Staff Admin'].includes(role)) {
    return res.status(400).json({ message: "Invalid role. Must be 'Main Admin' or 'Staff Admin'" });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3) RETURNING admin_id, username, role, created_at',
      [username, hashedPassword, role]
    );
    res.json({ message: 'Account created successfully', admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ message: 'Username already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

router.get('/admins', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT admin_id, username, role, created_at FROM admins ORDER BY admin_id ASC'
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
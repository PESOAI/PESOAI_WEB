import express from 'express';
import bcrypt  from 'bcrypt';
import jwt     from 'jsonwebtoken';
import pool from '../db.js';

const router = express.Router();

const JWT_SECRET  = process.env.JWT_SECRET || 'pesoi_super_secret_key_2026';
const JWT_EXPIRES = '9h';

// ─────────────────────────────────────────────────────────────
// Helpers: safe log / audit — never crash the caller
// ─────────────────────────────────────────────────────────────
async function safeLog(type, userName, message) {
  try {
    await pool.query(
      'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
      [type, userName, message]
    );
  } catch (_) {}
}

async function safeAudit(adminId, action, targetType = 'admin') {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, target_type) VALUES ($1, $2, $3)',
      [adminId, action, targetType]
    );
  } catch (err) {
    console.warn('[AUDIT WARN]', err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// Middleware: verify JWT token
// ─────────────────────────────────────────────────────────────
export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token)
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(403).json({ message: 'Invalid or expired token. Please log in again.' });
  }
};

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  console.log('[LOGIN] req.body:', req.body);
  const username = (req.body?.username || '').trim();
  const password = (req.body?.password || '').trim();

  if (!username || !password)
    return res.status(400).json({ message: 'Username and password are required' });

  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE username = $1',
      [username]
    );

    if (result.rows.length === 0) {
      await safeLog('FAILED', username, 'Failed login attempt: user not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const admin   = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (isMatch) {
      const token = jwt.sign(
        { id: admin.admin_id, name: admin.username, role: admin.role },
        JWT_SECRET,
        { expiresIn: JWT_EXPIRES }
      );
      await safeLog('SUCCESS', admin.username, `Authorized access as ${admin.role}`);
      await safeAudit(admin.admin_id, `Login: ${admin.username}`);

      return res.json({
        message: 'Login successful',
        token,
        user: {
          id:           admin.admin_id,
          name:         admin.username,
          role:         admin.role,
          avatar:       admin.avatar       || null,
          // ── FIX: include display_name so AdminLayout gets it on login ──
          display_name: admin.display_name || null,
        },
      });
    } else {
      await safeLog('FAILED', username, 'Failed login attempt: wrong password');
      return res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
router.post('/logout', verifyToken, async (req, res) => {
  await safeLog('SYSTEM', req.admin.name, `${req.admin.name} logged out`);
  await safeAudit(req.admin.id, `Logout: ${req.admin.name}`);
  res.json({ message: 'Logged out successfully' });
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/verify
// ─────────────────────────────────────────────────────────────
router.get('/verify', verifyToken, (req, res) => {
  res.json({ valid: true, user: req.admin });
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/admins/avatar
// ─────────────────────────────────────────────────────────────
router.put('/admins/avatar', verifyToken, async (req, res) => {
  const { avatar } = req.body;

  if (!avatar)
    return res.status(400).json({ message: 'No avatar data provided' });
  if (!avatar.startsWith('data:image/'))
    return res.status(400).json({ message: 'Invalid image format' });
  if (avatar.length > 2_800_000)
    return res.status(413).json({ message: 'Image too large. Please use an image under 2MB.' });

  try {
    await pool.query(
      'UPDATE admins SET avatar = $1 WHERE admin_id = $2',
      [avatar, req.admin.id]
    );
    await safeAudit(req.admin.id, 'Updated profile avatar');
    res.json({ message: 'Avatar saved successfully', avatar });
  } catch (err) {
    console.error('[AVATAR ERROR]', err);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/admins/display-name   ← NEW: persists display name to DB
// Body: { displayName: string }
// ─────────────────────────────────────────────────────────────
router.put('/admins/display-name', verifyToken, async (req, res) => {
  const { displayName } = req.body;
  if (!displayName || !displayName.trim())
    return res.status(400).json({ message: 'displayName is required' });

  try {
    await pool.query(
      'UPDATE admins SET display_name = $1 WHERE admin_id = $2',
      [displayName.trim(), req.admin.id]
    );
    await safeAudit(req.admin.id, `Updated display name to "${displayName.trim()}"`);
    res.json({ message: 'Display name updated', displayName: displayName.trim() });
  } catch (err) {
    console.error('[DISPLAY NAME ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/admins/me
// ─────────────────────────────────────────────────────────────
router.get('/admins/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      // ── FIX: include display_name so layout always gets the latest value ──
      'SELECT admin_id, username, role, avatar, display_name, created_at FROM admins WHERE admin_id = $1',
      [req.admin.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Admin not found' });

    const admin = result.rows[0];
    res.json({
      id:           admin.admin_id,
      name:         admin.username,
      role:         admin.role,
      avatar:       admin.avatar       || null,
      display_name: admin.display_name || null,
      created_at:   admin.created_at,
    });
  } catch (err) {
    console.error('[ME ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/admins  (create new admin — Main Admin only)
// ─────────────────────────────────────────────────────────────
router.post('/admins', verifyToken, async (req, res) => {
  const { username, password, role } = req.body;

  if (req.admin.role !== 'Main Admin')
    return res.status(403).json({ message: 'Forbidden: Only Main Admin can create accounts' });
  if (!['Main Admin', 'Staff Admin'].includes(role))
    return res.status(400).json({ message: "Invalid role. Must be 'Main Admin' or 'Staff Admin'" });

  try {
    const hashed = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3) RETURNING admin_id, username, role, created_at',
      [username, hashed, role]
    );
    await safeAudit(req.admin.id, `Created admin: ${username} (${role})`);
    res.json({ message: 'Account created successfully', admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(409).json({ message: 'Username already exists' });
    console.error('[CREATE ADMIN ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/admins
// ─────────────────────────────────────────────────────────────
router.get('/admins', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      // ── FIX: include display_name so AdminMgmtPanel shows updated names ──
      'SELECT admin_id, username, display_name, role, avatar, created_at FROM admins ORDER BY admin_id ASC'
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('[GET ADMINS ERROR]', err.message);
    res.status(500).json({ message: 'Server error', detail: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// DELETE /api/auth/admins/:id
// ─────────────────────────────────────────────────────────────
router.delete('/admins/:id', verifyToken, async (req, res) => {
  if (req.admin.role !== 'Main Admin')
    return res.status(403).json({ message: 'Forbidden: Only Main Admin can remove accounts' });

  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.admin.id)
    return res.status(400).json({ message: 'You cannot delete your own account' });

  try {
    const check = await pool.query(
      'SELECT role, username FROM admins WHERE admin_id = $1',
      [targetId]
    );
    if (check.rows.length === 0)
      return res.status(404).json({ message: 'Admin not found' });
    if (check.rows[0].role === 'Main Admin')
      return res.status(403).json({ message: 'Cannot delete another Main Admin' });

    const deletedUsername = check.rows[0].username;
    await pool.query('DELETE FROM admins WHERE admin_id = $1', [targetId]);
    await safeAudit(req.admin.id, `Deleted admin: ${deletedUsername}`);
    await safeLog('SYSTEM', req.admin.name, `Deleted admin account: ${deletedUsername}`);
    res.json({ message: `Admin "${deletedUsername}" deleted successfully` });
  } catch (err) {
    console.error('[DELETE ADMIN ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/admins/change-password
// ─────────────────────────────────────────────────────────────
router.put('/admins/change-password', verifyToken, async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword)
    return res.status(400).json({ message: 'Both current and new password are required' });
  if (newPassword.length < 8)
    return res.status(400).json({ message: 'New password must be at least 8 characters' });

  try {
    const result = await pool.query(
      'SELECT * FROM admins WHERE admin_id = $1',
      [req.admin.id]
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch)
      return res.status(401).json({ message: 'Current password is incorrect' });
    if (currentPassword === newPassword)
      return res.status(400).json({ message: 'New password must differ from current password' });

    const hashed = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admins SET password = $1 WHERE admin_id = $2',
      [hashed, req.admin.id]
    );
    await safeLog('SYSTEM', req.admin.name, 'Changed their password');
    await safeAudit(req.admin.id, 'Changed password');
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[CHANGE PASSWORD ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/audit-logs
// ─────────────────────────────────────────────────────────────
router.get('/audit-logs', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        al.id,
        al.action,
        al.target_type,
        al.created_at,
        a.username  AS admin_name,
        a.role      AS admin_role
      FROM admin_logs al
      LEFT JOIN admins a ON a.admin_id = al.admin_id
      ORDER BY al.created_at DESC
      LIMIT 200
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[AUDIT GET ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/audit-logs
// ─────────────────────────────────────────────────────────────
router.post('/audit-logs', verifyToken, async (req, res) => {
  const { action, target_type = 'general' } = req.body;
  if (!action)
    return res.status(400).json({ message: 'action is required' });

  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, target_type) VALUES ($1, $2, $3)',
      [req.admin.id, action, target_type]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[AUDIT POST ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
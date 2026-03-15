import bcrypt from 'bcrypt';
import jwt    from 'jsonwebtoken';
import pool   from '../config/db.js';
import { JWT_SECRET, JWT_EXPIRES } from '../config/index.js';
import { HTTP, ROLES, BCRYPT_ROUNDS, AUDIT_LIMIT } from '../constants/index.js';

// ── Helpers ───────────────────────────────────────────────────
export async function safeLog(type, userName, message) {
  try {
    await pool.query(
      'INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)',
      [type, userName, message]
    );
  } catch (_) {}
}

export async function safeAudit(adminId, action, targetType = 'admin') {
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, target_type) VALUES ($1, $2, $3)',
      [adminId, action, targetType]
    );
  } catch (err) {
    console.warn('[AUDIT WARN]', err.message);
  }
}

// ── POST /api/auth/login ──────────────────────────────────────
export const login = async (req, res) => {
  console.log('[LOGIN] req.body:', req.body);
  const { username, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE username = $1', [username]);

    if (result.rows.length === 0) {
      await safeLog('FAILED', username, 'Failed login attempt: user not found');
      return res.status(HTTP.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }

    const admin   = result.rows[0];
    const isMatch = await bcrypt.compare(password, admin.password);

    if (!isMatch) {
      await safeLog('FAILED', username, 'Failed login attempt: wrong password');
      return res.status(HTTP.UNAUTHORIZED).json({ message: 'Invalid credentials' });
    }

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
        display_name: admin.display_name || null,
      },
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(HTTP.INTERNAL).json({ message: 'Server error', detail: err.message });
  }
};

// ── POST /api/auth/logout ─────────────────────────────────────
export const logout = async (req, res) => {
  await safeLog('SYSTEM', req.admin.name, `${req.admin.name} logged out`);
  await safeAudit(req.admin.id, `Logout: ${req.admin.name}`);
  res.json({ message: 'Logged out successfully' });
};

// ── GET /api/auth/verify ──────────────────────────────────────
export const verify = (req, res) => {
  res.json({ valid: true, user: req.admin });
};

// ── PUT /api/auth/admins/avatar ───────────────────────────────
export const updateAvatar = async (req, res) => {
  const { avatar } = req.body;
  try {
    await pool.query('UPDATE admins SET avatar = $1 WHERE admin_id = $2', [avatar, req.admin.id]);
    await safeAudit(req.admin.id, 'Updated profile avatar');
    res.json({ message: 'Avatar saved successfully', avatar });
  } catch (err) {
    console.error('[AVATAR ERROR]', err);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── PUT /api/auth/admins/display-name ────────────────────────
export const updateDisplayName = async (req, res) => {
  const { displayName } = req.body;
  try {
    await pool.query(
      'UPDATE admins SET display_name = $1 WHERE admin_id = $2',
      [displayName, req.admin.id]
    );
    await safeAudit(req.admin.id, `Updated display name to "${displayName}"`);
    res.json({ message: 'Display name updated', displayName });
  } catch (err) {
    console.error('[DISPLAY NAME ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── GET /api/auth/admins/me ───────────────────────────────────
export const getMe = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT admin_id, username, role, avatar, display_name, created_at FROM admins WHERE admin_id = $1',
      [req.admin.id]
    );
    if (result.rows.length === 0)
      return res.status(HTTP.NOT_FOUND).json({ message: 'Admin not found' });

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
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── POST /api/auth/admins ─────────────────────────────────────
export const createAdmin = async (req, res) => {
  const { username, password, role } = req.body;

  if (req.admin.role !== ROLES.MAIN_ADMIN)
    return res.status(HTTP.FORBIDDEN).json({ message: 'Forbidden: Only Main Admin can create accounts' });

  try {
    const hashed = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const result = await pool.query(
      'INSERT INTO admins (username, password, role) VALUES ($1, $2, $3) RETURNING admin_id, username, role, created_at',
      [username, hashed, role]
    );
    await safeAudit(req.admin.id, `Created admin: ${username} (${role})`);
    res.json({ message: 'Account created successfully', admin: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(HTTP.CONFLICT).json({ message: 'Username already exists' });
    console.error('[CREATE ADMIN ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── GET /api/auth/admins ──────────────────────────────────────
export const getAdmins = async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT admin_id, username, display_name, role, avatar, created_at FROM admins ORDER BY admin_id ASC'
    );
    res.json(result.rows || []);
  } catch (err) {
    console.error('[GET ADMINS ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ message: 'Server error', detail: err.message });
  }
};

// ── DELETE /api/auth/admins/:id ───────────────────────────────
export const deleteAdmin = async (req, res) => {
  if (req.admin.role !== ROLES.MAIN_ADMIN)
    return res.status(HTTP.FORBIDDEN).json({ message: 'Forbidden: Only Main Admin can remove accounts' });

  const targetId = parseInt(req.params.id, 10);
  if (targetId === req.admin.id)
    return res.status(HTTP.BAD_REQUEST).json({ message: 'You cannot delete your own account' });

  try {
    const check = await pool.query('SELECT role, username FROM admins WHERE admin_id = $1', [targetId]);
    if (check.rows.length === 0)
      return res.status(HTTP.NOT_FOUND).json({ message: 'Admin not found' });
    if (check.rows[0].role === ROLES.MAIN_ADMIN)
      return res.status(HTTP.FORBIDDEN).json({ message: 'Cannot delete another Main Admin' });

    const deletedUsername = check.rows[0].username;
    await pool.query('DELETE FROM admins WHERE admin_id = $1', [targetId]);
    await safeAudit(req.admin.id, `Deleted admin: ${deletedUsername}`);
    await safeLog('SYSTEM', req.admin.name, `Deleted admin account: ${deletedUsername}`);
    res.json({ message: `Admin "${deletedUsername}" deleted successfully` });
  } catch (err) {
    console.error('[DELETE ADMIN ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── PUT /api/auth/admins/change-password ─────────────────────
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  try {
    const result = await pool.query('SELECT * FROM admins WHERE admin_id = $1', [req.admin.id]);
    if (result.rows.length === 0)
      return res.status(HTTP.NOT_FOUND).json({ message: 'Admin not found' });

    const isMatch = await bcrypt.compare(currentPassword, result.rows[0].password);
    if (!isMatch)
      return res.status(HTTP.UNAUTHORIZED).json({ message: 'Current password is incorrect' });
    if (currentPassword === newPassword)
      return res.status(HTTP.BAD_REQUEST).json({ message: 'New password must differ from current password' });

    const hashed = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await pool.query('UPDATE admins SET password = $1 WHERE admin_id = $2', [hashed, req.admin.id]);
    await safeLog('SYSTEM', req.admin.name, 'Changed their password');
    await safeAudit(req.admin.id, 'Changed password');
    res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('[CHANGE PASSWORD ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── GET /api/auth/audit-logs ──────────────────────────────────
export const getAuditLogs = async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        al.id, al.action, al.target_type, al.created_at,
        a.username AS admin_name,
        a.role     AS admin_role
      FROM admin_logs al
      LEFT JOIN admins a ON a.admin_id = al.admin_id
      ORDER BY al.created_at DESC
      LIMIT ${AUDIT_LIMIT}
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[AUDIT GET ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};

// ── POST /api/auth/audit-logs ─────────────────────────────────
export const createAuditLog = async (req, res) => {
  const { action, target_type = 'general' } = req.body;
  try {
    await pool.query(
      'INSERT INTO admin_logs (admin_id, action, target_type) VALUES ($1, $2, $3)',
      [req.admin.id, action, target_type]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[AUDIT POST ERROR]', err.message);
    res.status(HTTP.INTERNAL).json({ error: err.message });
  }
};
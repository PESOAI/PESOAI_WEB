import bcrypt from 'bcryptjs';
import pool from '../../config/db.js';
import { MESSAGES } from '../../shared/constants/messages.js';
import { parsePagination, isNonEmptyString, isValidEmail } from '../../shared/validators/index.js';
import { bustMaintenanceCache } from '../../middleware/maintenance.middleware.js';

// ── GET /api/superadmin/users  — full user list with all fields ───────────────
const listUsersDetailed = async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  const search = req.query.search ? `%${req.query.search}%` : null;
  try {
    const countQ = search
      ? `SELECT COUNT(*) FROM users WHERE role='user' AND (username ILIKE $1 OR email ILIKE $1 OR first_name ILIKE $1)`
      : `SELECT COUNT(*) FROM users WHERE role='user'`;
    const countR = await pool.query(countQ, search ? [search] : []);
    const total  = parseInt(countR.rows[0].count);

    const dataQ  = search
      ? `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.role,
                u.is_active, u.token_version, u.is_disabled, u.disabled_reason, u.disabled_at,
                u.onboarding_completed, u.created_at,
                p.age, p.gender, p.occupation, p.monthly_income, p.budget_period,
                COUNT(t.id)::int AS total_transactions,
                COALESCE(SUM(t.amount),0) AS total_spent
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         LEFT JOIN transactions  t ON u.id = t.user_id
         WHERE u.role='user' AND (u.username ILIKE $1 OR u.email ILIKE $1 OR u.first_name ILIKE $1)
         GROUP BY u.id, p.age, p.gender, p.occupation, p.monthly_income, p.budget_period
         ORDER BY u.created_at DESC LIMIT $2 OFFSET $3`
      : `SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.role,
                u.is_active, u.token_version, u.is_disabled, u.disabled_reason, u.disabled_at,
                u.onboarding_completed, u.created_at,
                p.age, p.gender, p.occupation, p.monthly_income, p.budget_period,
                COUNT(t.id)::int AS total_transactions,
                COALESCE(SUM(t.amount),0) AS total_spent
         FROM users u
         LEFT JOIN user_profiles p ON u.id = p.user_id
         LEFT JOIN transactions  t ON u.id = t.user_id
         WHERE u.role='user'
         GROUP BY u.id, p.age, p.gender, p.occupation, p.monthly_income, p.budget_period
         ORDER BY u.created_at DESC LIMIT $1 OFFSET $2`;
    const dataR  = await pool.query(dataQ, search ? [search, limit, offset] : [limit, offset]);

    return res.json({
      success: true,
      data: { users: dataR.rows, total, page, limit, totalPages: Math.ceil(total/limit) },
    });
  } catch (err) {
    console.error('[SuperAdmin] listUsersDetailed:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_USER_LIST_FAILED });
  }
};

// ── GET /api/superadmin/users/:userId/transactions  (LOGGED) ─────────────────
const getUserTransactions = async (req, res) => {
  const { userId } = req.params;
  const { page, limit, offset } = parsePagination(req.query);
  try {
    const check = await pool.query('SELECT id FROM users WHERE id=$1 AND role=$2', [userId,'user']);
    if (!check.rowCount) return res.status(404).json({ success: false, message: MESSAGES.ADMIN_USER_NOT_FOUND });

    const [countR, dataR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM transactions WHERE user_id=$1', [userId]),
      pool.query(`SELECT * FROM transactions
                  WHERE user_id=$1
                  ORDER BY transaction_date DESC, created_at DESC, id DESC
                  LIMIT $2 OFFSET $3`,
        [userId, limit, offset]),
    ]);
    const total = parseInt(countR.rows[0].count);
    return res.json({
      success: true,
      data: {
        transactions: dataR.rows,
        total,
        page, limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[SuperAdmin] getUserTransactions:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.TRANSACTION_FETCH_FAILED });
  }
};

// â”€â”€ GET /api/superadmin/users/:userId/sessions  (LOGGED) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const getUserSessions = async (req, res) => {
  const { userId } = req.params;
  const { page, limit, offset } = parsePagination(req.query, 20, 100);
  try {
    const check = await pool.query('SELECT id FROM users WHERE id=$1 AND role=$2', [userId, 'user']);
    if (!check.rowCount) return res.status(404).json({ success: false, message: MESSAGES.ADMIN_USER_NOT_FOUND });

    const [countR, dataR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM session_logs WHERE user_id=$1', [userId]),
      pool.query(
        `SELECT id, user_id, login_time, logout_time, ip_address, user_agent
         FROM session_logs
         WHERE user_id=$1
         ORDER BY login_time DESC, id DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
    ]);

    const total = parseInt(countR.rows[0].count);
    return res.json({
      success: true,
      data: {
        sessions: dataR.rows,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error('[SuperAdmin] getUserSessions:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.SERVER_ERROR });
  }
};

// ── PUT /api/superadmin/users/:userId/disable ─────────────────────────────────
const disableUser = async (req, res) => {
  const { userId } = req.params;
  const { reason } = req.body;
  try {
    const check = await pool.query('SELECT id,is_disabled FROM users WHERE id=$1 AND role=$2',[userId,'user']);
    if (!check.rowCount) return res.status(404).json({ success: false, message: MESSAGES.ADMIN_USER_NOT_FOUND });
    if (check.rows[0].is_disabled) return res.status(409).json({ success: false, message: MESSAGES.ADMIN_USER_ALREADY_DISABLED });
    await pool.query(
      `UPDATE users
       SET is_active=FALSE,
           is_disabled=TRUE,
           disabled_reason=$1,
           disabled_at=CURRENT_TIMESTAMP,
           token_version=COALESCE(token_version, 0) + 1
       WHERE id=$2`,
      [reason||null, userId]
    );
    return res.json({ success: true, message: MESSAGES.ADMIN_USER_DISABLED });
  } catch (err) {
    console.error('[SuperAdmin] disableUser:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_USER_UPDATE_FAILED });
  }
};

// ── PUT /api/superadmin/users/:userId/enable ──────────────────────────────────
const enableUser = async (req, res) => {
  const { userId } = req.params;
  try {
    const check = await pool.query('SELECT id,is_disabled FROM users WHERE id=$1 AND role=$2',[userId,'user']);
    if (!check.rowCount) return res.status(404).json({ success: false, message: MESSAGES.ADMIN_USER_NOT_FOUND });
    if (!check.rows[0].is_disabled) return res.status(409).json({ success: false, message: MESSAGES.ADMIN_USER_ALREADY_ENABLED });
    await pool.query(
      `UPDATE users
       SET is_active=TRUE,
           is_disabled=FALSE,
           disabled_reason=NULL,
           disabled_at=NULL,
           token_version=COALESCE(token_version, 0) + 1
       WHERE id=$1`,
      [userId]
    );
    return res.json({ success: true, message: MESSAGES.ADMIN_USER_ENABLED });
  } catch (err) {
    console.error('[SuperAdmin] enableUser:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_USER_UPDATE_FAILED });
  }
};

// ── GET /api/superadmin/maintenance ───────────────────────────────────────────
const getMaintenanceStatus = async (req, res) => {
  try {
    const r = await pool.query('SELECT * FROM maintenance_mode WHERE id=1');
    const row = r.rows[0];
    return res.json({ success: true, message: MESSAGES.MAINTENANCE_FETCHED,
      maintenance: { isActive: row.is_active, title: row.title, message: row.message, updatedAt: row.updated_at }
    });
  } catch (err) {
    console.error('[SuperAdmin] getMaintenance:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.MAINTENANCE_FETCH_FAILED });
  }
};

// ── POST /api/superadmin/maintenance ──────────────────────────────────────────
const setMaintenanceStatus = async (req, res) => {
  const { isActive, title, message } = req.body;
  if (typeof isActive !== 'boolean')
    return res.status(400).json({ success: false, message: '`isActive` (boolean) is required.' });
  try {
    // FIX: updated_by is a UUID column (references users.id) but req.admin.id
    //      is an integer from the admins table — passing it causes a type mismatch
    //      crash in PostgreSQL.  We skip updated_by entirely here (safe; column
    //      is nullable and the admins table is separate from the users UUID space).
    await pool.query(
      `UPDATE maintenance_mode
       SET is_active=$1, title=COALESCE($2,title), message=COALESCE($3,message),
           updated_at=CURRENT_TIMESTAMP
       WHERE id=1`,
      [isActive, title||null, message||null]
    );
    bustMaintenanceCache(); // flush in-process cache immediately
    return res.json({ success: true, message: MESSAGES.MAINTENANCE_UPDATED });
  } catch (err) {
    console.error('[SuperAdmin] setMaintenance:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.MAINTENANCE_FAILED });
  }
};

// ── GET /api/superadmin/admins  — list all admin accounts ────────────────────
// FIX: admin accounts live in the admins table (admin_id, username, role,
//      display_name, avatar, created_at) — NOT in the users table.
const listAdmins = async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT admin_id AS id, username, role, display_name, avatar, created_at
       FROM admins
       ORDER BY created_at DESC`
    );
    return res.json({ success: true, data: r.rows });
  } catch (err) {
    console.error('[SuperAdmin] listAdmins:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_LIST_FAILED });
  }
};

// ── POST /api/superadmin/admins  — create admin account ─────────────────────
const createAdmin = async (req, res) => {
  const { firstName, lastName, username, email, password } = req.body;
  if (!isNonEmptyString(firstName)) return res.status(400).json({ success: false, message: 'First name required.' });
  if (!isNonEmptyString(username))  return res.status(400).json({ success: false, message: 'Username required.' });
  if (!isValidEmail(email))         return res.status(400).json({ success: false, message: 'Valid email required.' });
  if (!isNonEmptyString(password) || password.length < 8)
    return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
  try {
    const dup = await pool.query('SELECT id FROM users WHERE email=$1 OR username=$2',[email.trim().toLowerCase(), username.trim().toLowerCase()]);
    if (dup.rowCount) return res.status(409).json({ success: false, message: 'Email or username already in use.' });

    const hash = await bcrypt.hash(password, 12);
    const r    = await pool.query(
      `INSERT INTO users (first_name, last_name, username, email, password, role, onboarding_completed)
       VALUES ($1,$2,$3,$4,$5,'admin',TRUE) RETURNING id, username, email, created_at`,
      [firstName.trim(), (lastName||'').trim(), username.trim().toLowerCase(), email.trim().toLowerCase(), hash]
    );
    return res.status(201).json({ success: true, message: MESSAGES.ADMIN_CREATE_SUCCESS, data: r.rows[0] });
  } catch (err) {
    console.error('[SuperAdmin] createAdmin:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_CREATE_FAILED });
  }
};

// ── DELETE /api/superadmin/admins/:adminId  — remove admin account ───────────
const deleteAdmin = async (req, res) => {
  const { adminId } = req.params;
  if (adminId === req.admin.id)
    return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
  try {
    const r = await pool.query(`DELETE FROM users WHERE id=$1 AND role='admin' RETURNING id`, [adminId]);
    if (!r.rowCount) return res.status(404).json({ success: false, message: 'Admin not found.' });
    return res.json({ success: true, message: MESSAGES.ADMIN_DELETE_SUCCESS });
  } catch (err) {
    console.error('[SuperAdmin] deleteAdmin:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.ADMIN_DELETE_FAILED });
  }
};

// ── GET /api/superadmin/access-logs  — audit trail ───────────────────────────
const getAccessLogs = async (req, res) => {
  const { page, limit, offset } = parsePagination(req.query, 50);
  try {
    const [countR, dataR] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM access_logs'),
      pool.query(`
        SELECT al.*, u.username AS actor_username
        FROM access_logs al
        LEFT JOIN users u ON al.actor_id = u.id
        ORDER BY al.accessed_at DESC LIMIT $1 OFFSET $2
      `, [limit, offset]),
    ]);
    return res.json({
      success: true,
      data: { logs: dataR.rows, total: parseInt(countR.rows[0].count), page, limit },
    });
  } catch (err) {
    console.error('[SuperAdmin] getAccessLogs:', err.message);
    return res.status(500).json({ success: false, message: MESSAGES.SERVER_ERROR });
  }
};

// ── DELETE /api/superadmin/announcements/:id  (superadmin hard-delete) ────────
// ── PUT    /api/superadmin/announcements/:id  (superadmin can also update/toggle) ─
import { deleteAnnouncement, updateAnnouncement } from '../announcements/announcements.controller.js';

export { listUsersDetailed, getUserTransactions, getUserSessions,
  disableUser, enableUser,
  getMaintenanceStatus, setMaintenanceStatus,
  listAdmins, createAdmin, deleteAdmin,
  getAccessLogs,
  updateAnnouncement,
};

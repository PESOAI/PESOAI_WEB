// routes/users.js  –  PESO AI
import express from 'express';
import pool from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/users  —  full user list with location
// ─────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        u.user_id,
        u.full_name,
        u.join_date,
        u.email,
        u.phone_number,
        u.account_status,
        u.risk_level,
        u.last_active_at,
        l.city,
        l.country
      FROM users u
      LEFT JOIN locations l ON u.location_id = l.location_id
      ORDER BY u.join_date DESC
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[USERS ERROR]', err.message);
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/:id  —  toggle account status
// ─────────────────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { account_status } = req.body;

  if (!['Active', 'Inactive'].includes(account_status)) {
    return res.status(400).json({ message: 'Invalid status value' });
  }

  try {
    const result = await pool.query(
      `UPDATE users SET account_status = $1 WHERE user_id = $2
       RETURNING user_id, full_name, account_status`,
      [account_status, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('[STATUS UPDATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/kpis
// ─────────────────────────────────────────────────────────────
router.get('/admin/kpis', async (req, res) => {
  try {
    const [userStats, financials] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*)                                                            AS total_users,
          COUNT(CASE WHEN account_status = 'Active' THEN 1 END)              AS active_users,
          ROUND(
            COUNT(CASE WHEN account_status = 'Active' THEN 1 END)::NUMERIC
            / NULLIF(COUNT(*), 0) * 100, 1
          )                                                                   AS pct_active
        FROM users
      `),
      pool.query(`
        SELECT
          ROUND(AVG(inc.total), 2)                                 AS avg_income,
          ROUND(AVG(exp.total), 2)                                 AS avg_expenses,
          ROUND(AVG(inc.total - COALESCE(exp.total, 0)), 2)        AS avg_savings
        FROM (
          SELECT user_id, SUM(amount) AS total FROM transactions
          WHERE type = 'income'
            AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
          GROUP BY user_id
        ) inc
        LEFT JOIN (
          SELECT user_id, SUM(amount) AS total FROM transactions
          WHERE type = 'expense'
            AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
          GROUP BY user_id
        ) exp ON inc.user_id = exp.user_id
      `)
    ]);

    const u = userStats.rows[0];
    const f = financials.rows[0];
    res.json({
      total_users:  parseInt(u.total_users),
      active_users: parseInt(u.active_users),
      pct_active:   parseFloat(u.pct_active   || 0),
      avg_income:   parseFloat(f.avg_income   || 0),
      avg_expenses: parseFloat(f.avg_expenses || 0),
      avg_savings:  parseFloat(f.avg_savings  || 0),
    });
  } catch (err) {
    console.error('[KPI ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/top-categories
// ─────────────────────────────────────────────────────────────
router.get('/admin/top-categories', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        c.name        AS category,
        c.color_hex,
        SUM(t.amount) AS total_spent
      FROM transactions t
      JOIN categories c ON c.category_id = t.category_id
      WHERE t.type = 'expense'
        AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR  FROM t.transaction_date) = EXTRACT(YEAR  FROM NOW())
      GROUP BY c.category_id, c.name, c.color_hex
      ORDER BY total_spent DESC
      LIMIT 6
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[CATEGORIES ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/high-risk
//
// FIX: now returns ALL users with their risk_level from the DB.
// Accepts optional ?risk_level=High|Medium|Low|all query param
// so the frontend can filter, or the backend can filter — both work.
//
// Also computes expense_ratio from transactions for display,
// but the primary risk classification comes from users.risk_level.
// ─────────────────────────────────────────────────────────────
router.get('/admin/high-risk', async (req, res) => {
  try {
    const { risk_level } = req.query; // 'High' | 'Medium' | 'Low' | 'all' | undefined

    // Build optional WHERE filter for risk_level
    // We always return all risk levels unless a specific one is requested
    const riskFilter = risk_level && risk_level !== 'all'
      ? `AND u.risk_level = $1`
      : '';
    const queryParams = risk_level && risk_level !== 'all' ? [risk_level] : [];

    const result = await pool.query(`
      SELECT
        u.user_id,
        u.full_name,
        u.email,
        u.account_status,
        u.risk_level,
        COALESCE(ROUND(inc.total, 2), 0)  AS total_income,
        COALESCE(ROUND(exp.total, 2), 0)  AS total_expenses,
        CASE
          WHEN COALESCE(inc.total, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(exp.total, 0) / inc.total * 100, 1)
        END AS expense_ratio
      FROM users u
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total FROM transactions
        WHERE type = 'income'
          AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
        GROUP BY user_id
      ) inc ON inc.user_id = u.user_id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total FROM transactions
        WHERE type = 'expense'
          AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
        GROUP BY user_id
      ) exp ON exp.user_id = u.user_id
      WHERE u.risk_level IS NOT NULL
      ${riskFilter}
      ORDER BY
        CASE u.risk_level
          WHEN 'High'   THEN 1
          WHEN 'Medium' THEN 2
          WHEN 'Low'    THEN 3
          ELSE 4
        END,
        expense_ratio DESC
    `, queryParams);

    res.json(result.rows || []);
  } catch (err) {
    console.error('[HIGH RISK ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/monthly-trend
// Supports ?period=daily|weekly|monthly  (default: monthly)
// ─────────────────────────────────────────────────────────────
router.get('/admin/monthly-trend', async (req, res) => {
  const { period = 'monthly' } = req.query;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  try {

    // ── DAILY: Day 1 of current month → today ──────────────
    if (period === 'daily') {
      const result = await pool.query(`
        SELECT
          day,
          ROUND(AVG(daily_income),   2) AS avg_income,
          ROUND(AVG(daily_expenses), 2) AS avg_expenses
        FROM (
          SELECT
            transaction_date::DATE AS day,
            user_id,
            SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS daily_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS daily_expenses
          FROM transactions
          WHERE transaction_date::DATE >= DATE_TRUNC('month', CURRENT_DATE)::DATE
            AND transaction_date::DATE <= CURRENT_DATE
          GROUP BY transaction_date::DATE, user_id
        ) per_user_day
        GROUP BY day
        ORDER BY day
      `);
      const formatted = result.rows.map(r => {
        const d = new Date(r.day);
        return {
          label:        months[d.getMonth()] + ' ' + d.getDate(),
          avg_income:   parseFloat(r.avg_income   || 0),
          avg_expenses: parseFloat(r.avg_expenses || 0),
          avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
        };
      });
      return res.json(formatted);
    }

    // ── WEEKLY: Last 8 weeks → current week ────────────────
    if (period === 'weekly') {
      const result = await pool.query(`
        SELECT
          yr, wk,
          MIN(week_start) AS week_start,
          ROUND(AVG(weekly_income),   2) AS avg_income,
          ROUND(AVG(weekly_expenses), 2) AS avg_expenses
        FROM (
          SELECT
            EXTRACT(YEAR FROM transaction_date)::INT          AS yr,
            EXTRACT(WEEK FROM transaction_date)::INT          AS wk,
            DATE_TRUNC('week', transaction_date)::DATE        AS week_start,
            user_id,
            SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS weekly_income,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS weekly_expenses
          FROM transactions
          WHERE transaction_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks'
            AND transaction_date <= CURRENT_DATE
          GROUP BY yr, wk, week_start, user_id
        ) per_user_week
        GROUP BY yr, wk
        ORDER BY yr, wk
      `);
      const formatted = result.rows.map(r => {
        const d = new Date(r.week_start);
        return {
          label:        months[d.getMonth()] + ' ' + d.getDate(),
          avg_income:   parseFloat(r.avg_income   || 0),
          avg_expenses: parseFloat(r.avg_expenses || 0),
          avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
        };
      });
      return res.json(formatted);
    }

    // ── MONTHLY: January 2026 → current month ──────────────
    const result = await pool.query(`
      SELECT
        yr, mo,
        ROUND(AVG(monthly_income),   2) AS avg_income,
        ROUND(AVG(monthly_expenses), 2) AS avg_expenses
      FROM (
        SELECT
          EXTRACT(YEAR  FROM transaction_date)::INT AS yr,
          EXTRACT(MONTH FROM transaction_date)::INT AS mo,
          user_id,
          SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END) AS monthly_income,
          SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS monthly_expenses
        FROM transactions
        WHERE transaction_date >= '2026-01-01'
          AND transaction_date <= CURRENT_DATE
        GROUP BY yr, mo, user_id
      ) per_user_month
      GROUP BY yr, mo
      ORDER BY yr, mo
    `);
    const formatted = result.rows.map(r => ({
      label:        months[r.mo - 1] + ' ' + r.yr,
      avg_income:   parseFloat(r.avg_income   || 0),
      avg_expenses: parseFloat(r.avg_expenses || 0),
      avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
    }));
    return res.json(formatted);

  } catch (err) {
    console.error('[TREND ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/savings-distribution
// ─────────────────────────────────────────────────────────────
router.get('/admin/savings-distribution', async (req, res) => {
  const { period = 'monthly' } = req.query;

  let dateFilter = '';
  if (period === 'daily') {
    dateFilter = "WHERE transaction_date >= NOW() - INTERVAL '13 days'";
  } else if (period === 'weekly') {
    dateFilter = "WHERE transaction_date >= NOW() - INTERVAL '7 weeks'";
  } else {
    dateFilter = "WHERE EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW()) AND EXTRACT(YEAR FROM transaction_date) = EXTRACT(YEAR FROM NOW())";
  }

  try {
    const result = await pool.query(`
      SELECT
        COUNT(CASE WHEN net < 0                     THEN 1 END) AS deficit,
        COUNT(CASE WHEN net >= 0 AND ratio < 0.20   THEN 1 END) AS low,
        COUNT(CASE WHEN ratio BETWEEN 0.20 AND 0.50 THEN 1 END) AS moderate,
        COUNT(CASE WHEN ratio > 0.50                THEN 1 END) AS high
      FROM (
        SELECT
          user_id,
          SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END)
          - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) AS net,
          (SUM(CASE WHEN type = 'income'  THEN amount ELSE 0 END)
          - SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END))
          / NULLIF(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS ratio
        FROM transactions
        ${dateFilter}
        GROUP BY user_id
      ) sub
    `);

    const r = result.rows[0];
    res.json([
      { name: 'Deficit',     value: parseInt(r.deficit  || 0), color: '#EF4444' },
      { name: 'Low (<20%)',  value: parseInt(r.low      || 0), color: '#F59E0B' },
      { name: 'Moderate',    value: parseInt(r.moderate || 0), color: '#3B82F6' },
      { name: 'High (>50%)', value: parseInt(r.high     || 0), color: '#22C55E' },
    ]);
  } catch (err) {
    console.error('[SAVINGS DIST ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
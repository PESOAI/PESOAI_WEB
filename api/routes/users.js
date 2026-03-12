// api/routes/users.js  –  PESO AI
import express from 'express';
import pool    from '../db.js';

const router = express.Router();

// ─────────────────────────────────────────────────────────────
// GET /api/users  —  full user list for User Management page
// ─────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.created_at,
        u.onboarding_completed,
        u.profile_picture,
        COALESCE(u.location,       up.location, 'No Data') AS location,
        COALESCE(u.last_active_at, u.created_at)           AS last_active_at
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      ORDER BY u.created_at DESC
    `);
    res.json(result.rows || []);
  } catch (err) {
    console.error('[USERS ERROR]', err.message);
    res.json([]);
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/users/:id  —  single user with profile
// ─────────────────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query(`
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.username,
        u.email,
        u.created_at,
        u.onboarding_completed,
        u.profile_picture,
        COALESCE(u.location,       up.location, 'No Data') AS location,
        COALESCE(u.last_active_at, u.created_at)           AS last_active_at,
        up.age,
        up.gender,
        up.occupation,
        up.monthly_income,
        up.monthly_expenses,
        up.financial_goals,
        up.risk_tolerance
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      WHERE u.id = $1
    `, [id]);

    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json(result.rows[0]);
  } catch (err) {
    console.error('[USER DETAIL ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/users/:id  —  update user fields
// ─────────────────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  const { id } = req.params;
  const { onboarding_completed, location } = req.body;

  const fields = [];
  const values = [];
  let idx = 1;

  if (typeof onboarding_completed === 'boolean') {
    fields.push(`onboarding_completed = $${idx++}`);
    values.push(onboarding_completed);
  }
  if (typeof location === 'string') {
    fields.push(`location = $${idx++}`);
    values.push(location);
  }

  fields.push(`last_active_at = NOW()`);

  if (fields.length === 1) {
    return res.status(400).json({ message: 'No valid fields provided to update' });
  }

  values.push(id);

  try {
    const result = await pool.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx}
       RETURNING id, first_name, last_name, onboarding_completed, location, last_active_at`,
      values
    );
    if (result.rows.length === 0)
      return res.status(404).json({ message: 'User not found' });

    res.json({ success: true, user: result.rows[0] });
  } catch (err) {
    console.error('[USER UPDATE ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/users/:id/active  —  ping last active timestamp
// ─────────────────────────────────────────────────────────────
router.post('/users/:id/active', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE users SET last_active_at = NOW() WHERE id = $1',
      [id]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('[ACTIVE UPDATE ERROR]', err.message);
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
          COUNT(*)                                                              AS total_users,
          COUNT(CASE WHEN onboarding_completed = true THEN 1 END)              AS active_users,
          ROUND(
            COUNT(CASE WHEN onboarding_completed = true THEN 1 END)::NUMERIC
            / NULLIF(COUNT(*), 0) * 100, 1
          )                                                                     AS pct_active
        FROM users
      `),
      pool.query(`
        SELECT
          ROUND(AVG(COALESCE(inc.total, 0)), 2)                          AS avg_income,
          ROUND(AVG(COALESCE(exp.total, 0)), 2)                          AS avg_expenses,
          ROUND(AVG(COALESCE(inc.total, 0) - COALESCE(exp.total, 0)), 2) AS avg_savings
        FROM users u
        LEFT JOIN (
          SELECT user_id, SUM(amount) AS total FROM transactions
          WHERE transaction_type = 'income'
            AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
          GROUP BY user_id
        ) inc ON inc.user_id = u.id
        LEFT JOIN (
          SELECT user_id, SUM(amount) AS total FROM transactions
          WHERE transaction_type = 'expense'
            AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
            AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
          GROUP BY user_id
        ) exp ON exp.user_id = u.id
      `),
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
        t.category,
        SUM(t.amount) AS total_spent
      FROM transactions t
      WHERE t.transaction_type = 'expense'
        AND EXTRACT(MONTH FROM t.transaction_date) = EXTRACT(MONTH FROM NOW())
        AND EXTRACT(YEAR  FROM t.transaction_date) = EXTRACT(YEAR  FROM NOW())
      GROUP BY t.category
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
// ─────────────────────────────────────────────────────────────
router.get('/admin/high-risk', async (req, res) => {
  try {
    const { risk_level } = req.query;

    const result = await pool.query(`
      SELECT
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.email,
        u.profile_picture,
        COALESCE(u.location, up.location, 'No Data')           AS location,
        COALESCE(u.last_active_at, u.created_at)               AS last_active_at,
        COALESCE(ROUND(inc.total, 2), 0)                        AS total_income,
        COALESCE(ROUND(exp.total, 2), 0)                        AS total_expenses,
        CASE
          WHEN COALESCE(inc.total, 0) = 0 THEN 0
          ELSE ROUND(COALESCE(exp.total, 0) / inc.total * 100, 1)
        END AS expense_ratio,
        CASE
          WHEN COALESCE(inc.total, 0) = 0 THEN 'High'
          WHEN COALESCE(exp.total, 0) / NULLIF(inc.total, 0) > 0.90 THEN 'High'
          WHEN COALESCE(exp.total, 0) / NULLIF(inc.total, 0) > 0.60 THEN 'Medium'
          ELSE 'Low'
        END AS risk_level
      FROM users u
      LEFT JOIN user_profiles up ON up.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total FROM transactions
        WHERE transaction_type = 'income'
          AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
        GROUP BY user_id
      ) inc ON inc.user_id = u.id
      LEFT JOIN (
        SELECT user_id, SUM(amount) AS total FROM transactions
        WHERE transaction_type = 'expense'
          AND EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
          AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())
        GROUP BY user_id
      ) exp ON exp.user_id = u.id
      ORDER BY expense_ratio DESC
    `);

    let rows = result.rows || [];
    if (risk_level && risk_level !== 'all') {
      rows = rows.filter(r => r.risk_level === risk_level);
    }

    res.json(rows);
  } catch (err) {
    console.error('[HIGH RISK ERROR]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/monthly-trend
// ─────────────────────────────────────────────────────────────
router.get('/admin/monthly-trend', async (req, res) => {
  const { period = 'monthly' } = req.query;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  try {
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
            SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END) AS daily_income,
            SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS daily_expenses
          FROM transactions
          WHERE transaction_date::DATE >= DATE_TRUNC('month', CURRENT_DATE)::DATE
            AND transaction_date::DATE <= CURRENT_DATE
          GROUP BY transaction_date::DATE, user_id
        ) per_user_day
        GROUP BY day ORDER BY day
      `);
      return res.json(result.rows.map(r => {
        const d = new Date(r.day);
        return {
          label:        months[d.getMonth()] + ' ' + d.getDate(),
          avg_income:   parseFloat(r.avg_income   || 0),
          avg_expenses: parseFloat(r.avg_expenses || 0),
          avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
        };
      }));
    }

    if (period === 'weekly') {
      const result = await pool.query(`
        SELECT
          yr, wk,
          MIN(week_start) AS week_start,
          ROUND(AVG(weekly_income),   2) AS avg_income,
          ROUND(AVG(weekly_expenses), 2) AS avg_expenses
        FROM (
          SELECT
            EXTRACT(YEAR FROM transaction_date)::INT           AS yr,
            EXTRACT(WEEK FROM transaction_date)::INT           AS wk,
            DATE_TRUNC('week', transaction_date)::DATE         AS week_start,
            user_id,
            SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END) AS weekly_income,
            SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS weekly_expenses
          FROM transactions
          WHERE transaction_date >= DATE_TRUNC('week', CURRENT_DATE) - INTERVAL '7 weeks'
            AND transaction_date <= CURRENT_DATE
          GROUP BY yr, wk, week_start, user_id
        ) per_user_week
        GROUP BY yr, wk ORDER BY yr, wk
      `);
      return res.json(result.rows.map(r => {
        const d = new Date(r.week_start);
        return {
          label:        months[d.getMonth()] + ' ' + d.getDate(),
          avg_income:   parseFloat(r.avg_income   || 0),
          avg_expenses: parseFloat(r.avg_expenses || 0),
          avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
        };
      }));
    }

    // Default: monthly
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
          SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END) AS monthly_income,
          SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS monthly_expenses
        FROM transactions
        WHERE transaction_date >= '2026-01-01'
          AND transaction_date <= CURRENT_DATE
        GROUP BY yr, mo, user_id
      ) per_user_month
      GROUP BY yr, mo ORDER BY yr, mo
    `);
    return res.json(result.rows.map(r => ({
      label:        months[r.mo - 1] + ' ' + r.yr,
      avg_income:   parseFloat(r.avg_income   || 0),
      avg_expenses: parseFloat(r.avg_expenses || 0),
      avg_savings:  parseFloat((r.avg_income  || 0) - (r.avg_expenses || 0)),
    })));

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
    dateFilter = `WHERE EXTRACT(MONTH FROM transaction_date) = EXTRACT(MONTH FROM NOW())
                    AND EXTRACT(YEAR  FROM transaction_date) = EXTRACT(YEAR  FROM NOW())`;
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
          SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END)
          - SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) AS net,
          (SUM(CASE WHEN transaction_type = 'income'  THEN amount ELSE 0 END)
          - SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END))
          / NULLIF(SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END), 0) AS ratio
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
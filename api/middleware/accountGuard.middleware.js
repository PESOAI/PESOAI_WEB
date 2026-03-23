import pool from '../config/db.js';

const buildDisabledMessage = (reason) => {
  if (typeof reason === 'string' && reason.trim().length > 0) {
    return `Account is disabled. Reason: ${reason.trim()}`;
  }
  return 'Account is disabled';
};

const accountGuard = async (req, res, next) => {
  const userId = req.user?.userId || req.user?.id;
  if (!userId) {
    return res.status(401).json({ success: false, message: 'Unauthorized.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, email, is_active, is_disabled, disabled_reason, token_version
       FROM users
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );

    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ success: false, message: 'Unauthorized.' });
    }

    if (user.is_active === false || user.is_disabled === true) {
      return res.status(403).json({
        success: false,
        message: buildDisabledMessage(user.disabled_reason),
        code: 'ACCOUNT_DISABLED',
        reason: user.disabled_reason || null,
        email: user.email || null,
      });
    }

    const decodedTokenVersion = Number(req.user?.tokenVersion ?? 0);
    const currentTokenVersion = Number(user.token_version ?? 0);
    if (decodedTokenVersion !== currentTokenVersion) {
      return res.status(401).json({
        success: false,
        message: 'Session expired. Please login again.',
        code: 'SESSION_INVALIDATED',
      });
    }

    req.account = user;
    return next();
  } catch (err) {
    console.error('[AccountGuard] validation failed:', err.message);
    return res.status(500).json({
      success: false,
      message: 'Unable to validate account status.',
    });
  }
};

export { accountGuard };

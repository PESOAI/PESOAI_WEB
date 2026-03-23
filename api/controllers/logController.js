import pool from '../config/db.js';
import { HTTP, ROLES, LOG_LIMIT } from '../constants/index.js';
import { sendError, sendSuccess } from '../utils/apiResponse.js';

export const createLog = async (req, res) => {
  const { type, user_name, message } = req.body;
  try {
    await pool.query('INSERT INTO system_logs (type, timestamp, user_name, message) VALUES ($1, NOW(), $2, $3)', [type, user_name, message]);
    res.json({ success: true });
  } catch (err) { res.status(HTTP.INTERNAL).json({ error: err.message }); }
};

export const createMobileErrorLog = async (req, res) => {
  const {
    source,
    category,
    severity = 'error',
    message,
    code = null,
    statusCode = null,
    userId = null,
    appVersion,
    appVersionCode,
    buildType,
    deviceModel,
    osVersion,
    details = null,
    occurredAt = null,
  } = req.body;

  const logMessage = [
    '[MOBILE]',
    `[${source}]`,
    code ? `[${code}]` : null,
    statusCode ? `[HTTP ${statusCode}]` : null,
    message,
  ].filter(Boolean).join(' ');

  const metadata = {
    category,
    severity,
    source,
    code,
    statusCode,
    appVersion,
    appVersionCode,
    buildType,
    deviceModel,
    osVersion,
    details,
    occurredAt,
  };

  try {
    await pool.query(
      `INSERT INTO system_logs (
        type, timestamp, user_name, message, source, error_code, status_code, user_id, metadata
      ) VALUES (
        $1, COALESCE(to_timestamp($2 / 1000.0), NOW()), $3, $4, $5, $6, $7, $8, $9::jsonb
      )`,
      [
        severity === 'warning' ? 'SYSTEM' : 'FAILED',
        occurredAt,
        userId ? `mobile:${userId}` : 'mobile:anonymous',
        logMessage,
        source,
        code,
        statusCode,
        userId,
        JSON.stringify(metadata),
      ]
    );

    return sendSuccess(res, {}, 'Mobile error log saved');
  } catch (err) {
    return sendError(res, HTTP.INTERNAL, 'Unable to save mobile error log', err.message);
  }
};

export const getLogs = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM system_logs ORDER BY timestamp DESC LIMIT $1', [LOG_LIMIT]);
    res.json(result.rows || []);
  } catch (err) { res.status(HTTP.INTERNAL).json({ error: err.message }); }
};

export const deleteLogs = async (req, res) => {
  if (req.admin?.role !== ROLES.MAIN_ADMIN)
    return res.status(HTTP.FORBIDDEN).json({ message: 'Only Main Admin can clear logs' });
  try {
    await pool.query('DELETE FROM system_logs');
    res.json({ success: true });
  } catch (err) { res.status(HTTP.INTERNAL).json({ error: err.message }); }
};

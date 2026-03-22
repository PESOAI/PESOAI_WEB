// api/middleware/csrfMiddleware.js
// Double-submit cookie CSRF protection for state-changing requests.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const EXEMPT_PATHS = new Set(['/api/auth/login', '/api/auth/refresh']);

export default function csrfMiddleware(req, res, next) {
  const method = (req.method || 'GET').toUpperCase();
  const path = (req.path || req.originalUrl || '').split('?')[0];

  if (SAFE_METHODS.has(method)) return next();
  if (EXEMPT_PATHS.has(path)) return next();

  const headerToken = req.headers['x-csrf-token'];
  const cookieToken = req.cookies?.csrf_token;

  if (!headerToken || !cookieToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  return next();
}

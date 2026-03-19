// api/middleware/authMiddleware.js
// Verifies access JWT strictly from HttpOnly cookie `token`.
import { HTTP } from '../constants/index.js';
import { verifyAccessToken } from '../utils/tokenService.js';

export const verifyToken = (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) {
    return res.status(HTTP.UNAUTHORIZED).json({ message: 'No token' });
  }

  try {
    const decoded = verifyAccessToken(token);
    req.admin = { id: decoded.id, name: decoded.name, role: decoded.role };
    return next();
  } catch {
    return res.status(HTTP.UNAUTHORIZED).json({ message: 'Invalid or expired token' });
  }
};


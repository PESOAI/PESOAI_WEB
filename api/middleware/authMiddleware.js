import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/index.js';
import { HTTP } from '../constants/index.js';

export const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token      = authHeader && authHeader.split(' ')[1];

  if (!token)
    return res.status(HTTP.UNAUTHORIZED).json({ message: 'Access denied. No token provided.' });

  try {
    req.admin = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(HTTP.FORBIDDEN).json({ message: 'Invalid or expired token. Please log in again.' });
  }
};
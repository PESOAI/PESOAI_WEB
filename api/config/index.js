// api/config/index.js
// Centralized runtime configuration for API, JWT, cookies, CORS, and database.
import 'dotenv/config';

export const PORT       = process.env.PORT       || 5000;
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const JWT_SECRET = process.env.JWT_SECRET || 'pesoi_super_secret_key_2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || `${JWT_SECRET}_refresh`;
export const JWT_ACCESS_EXPIRES = process.env.JWT_ACCESS_EXPIRES || '15m';
export const JWT_REFRESH_EXPIRES = process.env.JWT_REFRESH_EXPIRES || '7d';
export const BACKUP_ENCRYPTION_KEY = process.env.BACKUP_ENCRYPTION_KEY || JWT_SECRET;
export const COOKIE_SECURE = false;
export const COOKIE_SAME_SITE = 'lax';
export const ACCESS_COOKIE_NAME = 'token';
export const REFRESH_COOKIE_NAME = 'refreshToken';
export const REFRESH_TOKEN_TTL_DAYS = 7;

export const DB_CONFIG = process.env.DB_URL
  ? { connectionString: process.env.DB_URL }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
    };

export const CORS_ORIGINS = [
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'exp://127.0.0.1:19000',
  'capacitor://localhost',
  /^http:\/\/192\.168\./,
  /^http:\/\/10\./,
];

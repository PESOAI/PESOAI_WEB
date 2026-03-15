import 'dotenv/config';

export const PORT       = process.env.PORT       || 5000;
export const JWT_SECRET = process.env.JWT_SECRET  || 'pesoi_super_secret_key_2026';
export const JWT_EXPIRES = '9h';

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
  /^http:\/\/192\.168\./,
  /^http:\/\/10\./,
];
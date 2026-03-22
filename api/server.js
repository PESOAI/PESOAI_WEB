// api/server.js
// Express app bootstrap and middleware registration.
import express from 'express';
import helmet from 'helmet';
import cors    from 'cors';
import cookieParser from 'cookie-parser';
import csrfMiddleware from './middleware/csrfMiddleware.js';
import { authLimiter, refreshLimiter, globalLimiter } from './middleware/rateLimiter.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import logRoutes  from './routes/logs.js';
import userRoutes from './routes/users.js';
import maintenanceRoutes from './routes/maintenance.js';
import backupRoutes from './routes/backups.js';
import { CORS_ORIGINS } from './config/index.js';

const app = express();

app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'"],
      styleSrc:    ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc:     ["'self'", 'https://fonts.gstatic.com'],
      imgSrc:      ["'self'", 'data:', 'blob:'],
      connectSrc:  ["'self'"],
    },
  },
  crossOriginEmbedderPolicy: false,
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  frameguard: { action: 'deny' },
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }

    const allowed = CORS_ORIGINS.some((entry) =>
      entry instanceof RegExp ? entry.test(origin) : entry === origin
    );

    if (allowed) {
      callback(null, true);
      return;
    }

    callback(new Error('CORS origin not allowed'));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/refresh', refreshLimiter);
app.use('/api', globalLimiter);
app.use(csrfMiddleware);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api',      logRoutes);
app.use('/api',      userRoutes);
app.use('/api',      maintenanceRoutes);
app.use('/api',      backupRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

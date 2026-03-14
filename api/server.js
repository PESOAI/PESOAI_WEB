import express from 'express';
import cors    from 'cors';
import 'dotenv/config';

import authRoutes from './routes/auth.js';
import logRoutes  from './routes/logs.js';
import userRoutes from './routes/users.js';

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    /^http:\/\/192\.168\./,   
    /^http:\/\/10\./,         
  ],
  methods:      ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials:  true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Health check ──────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ── Routes ────────────────────────────────────────────────
app.use('/api/auth', authRoutes);   // /api/auth/login, /api/auth/audit-logs …
app.use('/api',      logRoutes);    // /api/logs
app.use('/api',      userRoutes);   // /api/users, /api/admin/*

// ── 404 ───────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
});

// ── Global error handler ──────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('🔴 Unhandled error:', err.message);
  res.status(500).json({ message: 'Internal server error', detail: err.message });
});

export default app;
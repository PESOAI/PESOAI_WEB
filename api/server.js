// api/server.js
// Express app bootstrap and middleware registration.
import express from 'express';
import cors    from 'cors';
import cookieParser from 'cookie-parser';
import { CORS_ORIGINS } from './config/index.js';
import { errorHandler, notFound } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import logRoutes  from './routes/logs.js';
import userRoutes from './routes/users.js';
import maintenanceRoutes from './routes/maintenance.js';

const app = express();

app.use(cookieParser());
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials:    true,
  methods:        ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api',      logRoutes);
app.use('/api',      userRoutes);
app.use('/api',      maintenanceRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;

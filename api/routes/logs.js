import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { createLog, getLogs, deleteLogs } from '../controllers/logController.js';

const router = express.Router();

router.post('/logs',   verifyToken, createLog);
router.get('/logs',    verifyToken, getLogs);
router.delete('/logs', verifyToken, deleteLogs);

export default router;
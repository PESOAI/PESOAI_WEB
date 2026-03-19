// api/routes/logs.js
// System activity log endpoints.
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { createLog, getLogs, deleteLogs } from '../controllers/logController.js';
import { validateCreateLog } from '../validators/logValidator.js';

const router = express.Router();

router.post('/logs',   verifyToken, validateCreateLog, createLog);
router.get('/logs',    verifyToken, getLogs);
router.delete('/logs', verifyToken, deleteLogs);

export default router;

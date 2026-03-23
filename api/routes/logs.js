import express from 'express';
import { verifyAdmin } from '../middleware/webAuthMiddleware.js';
import { createLog, createMobileErrorLog, getLogs, deleteLogs } from '../controllers/logController.js';
import { validateCreateLog, validateMobileErrorLog } from '../validators/logValidator.js';

const router = express.Router();
router.post('/logs/mobile-error', validateMobileErrorLog, createMobileErrorLog);
router.post('/logs',   verifyAdmin, validateCreateLog, createLog);
router.get('/logs',    verifyAdmin, getLogs);
router.delete('/logs', verifyAdmin, deleteLogs);

export default router;

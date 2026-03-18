import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getMaintenance, setMaintenance } from '../controllers/maintenanceController.js';

const router = express.Router();

router.get('/maintenance', verifyToken, getMaintenance);
router.post('/maintenance', verifyToken, setMaintenance);

export default router;


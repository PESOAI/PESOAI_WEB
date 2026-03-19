// api/routes/maintenance.js
// Maintenance mode read/write endpoints.
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import { getMaintenance, setMaintenance } from '../controllers/maintenanceController.js';
import { validateSetMaintenance } from '../validators/maintenanceValidator.js';

const router = express.Router();

router.get('/maintenance', verifyToken, getMaintenance);
router.post('/maintenance', verifyToken, validateSetMaintenance, setMaintenance);

export default router;

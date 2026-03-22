import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  listBackups,
  createBackup,
  downloadBackup,
  restoreBackup,
} from '../controllers/backupController.js';
import { validateRestoreBackup } from '../validators/backupValidator.js';

const router = express.Router();

router.get('/backups', verifyToken, listBackups);
router.post('/backups', verifyToken, createBackup);
router.get('/backups/:filename/download', verifyToken, downloadBackup);
router.post('/backups/restore', verifyToken, validateRestoreBackup, restoreBackup);
router.get('/admin/backups', verifyToken, listBackups);
router.post('/admin/backup', verifyToken, createBackup);
router.post('/admin/restore', verifyToken, validateRestoreBackup, restoreBackup);

export default router;

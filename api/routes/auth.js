// api/routes/auth.js
// Authentication, profile, admin management, and audit endpoints.
import express from 'express';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  login, logout, verify, refresh,
  updateAvatar, updateDisplayName,
  getMe, createAdmin, getAdmins, deleteAdmin,
  changePassword, getAuditLogs, createAuditLog,
} from '../controllers/authController.js';
import {
  validateLogin, validateChangePassword, validateAvatar,
  validateDisplayName, validateCreateAdmin, validateAuditLog, validateDeleteAdmin,
} from '../validators/authValidator.js';

const router = express.Router();

router.post('/login',                 validateLogin,            login);
router.post('/refresh',                                           refresh);
router.post('/logout',                                           logout);
router.get('/verify',                 verifyToken,              verify);
router.put('/admins/avatar',          verifyToken, validateAvatar,         updateAvatar);
router.put('/admins/display-name',    verifyToken, validateDisplayName,    updateDisplayName);
router.put('/admins/change-password', verifyToken, validateChangePassword, changePassword);
router.get('/admins/me',              verifyToken,              getMe);
router.post('/admins',                verifyToken, validateCreateAdmin,    createAdmin);
router.get('/admins',                 verifyToken,              getAdmins);
router.delete('/admins/:id',          verifyToken, validateDeleteAdmin, deleteAdmin);
router.get('/audit-logs',             verifyToken,              getAuditLogs);
router.post('/audit-logs',            verifyToken, validateAuditLog,       createAuditLog);

export default router;

import express from 'express';
const router   = express.Router();
import { verifyToken, authorizeOwner, authorizeOwnerBody } from '../../middleware/mobileAuthMiddleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { maintenanceGuard } from '../../middleware/maintenance.middleware.js';
import { accountGuard } from '../../middleware/accountGuard.middleware.js';

import { getProfile, updateProfile, uploadProfilePicture,
  updateBudget, updateBudgetPeriod, changePassword, deleteAccount, } from './profile.controller.js';

import { getDashboard, getFullProfile } from './dashboard.controller.js';

import { getNotifications, updateNotificationSettings,
  markRead, markAllRead, triggerDailyReminder, } from './notification.controller.js';

import { createBackup, listBackups, restoreBackup, deleteBackup } from './backup.controller.js';
import { getAppLock, setAppLock, verifyPin } from './app_lock.controller.js';
import { exportTransactionsPDF } from './export.controller.js';
import { getCategories, addCategory, updateCategory, deleteCategory } from './category.controller.js';

import { chatWithAI, clearConversation, getChatHistory, checkHealth,
  generateInsights, saveConversationHistory, getConversationHistory,
  getConversationById, deleteConversationHistory, } from './ai.controller.js';

import { getRecurring, createRecurring, updateRecurring, cancelRecurring,
  deleteRecurring, markRecurringAsPaid, dismissRecurring, } from './recurring.controller.js';

import { getUserAnnouncements } from '../announcements/announcements.controller.js';

// ── Middleware stack applied per-route to match original behaviour ─────────────
// verifyToken  — validates JWT, sets req.user = { id, role }
// authorizeRoles('user') — blocks admin/superadmin from user-only routes
// maintenanceGuard — returns 503 when maintenance is active (bypassed for admin+SA)
// authorizeOwner — confirms token owner == :userId param

// ── Dashboard ─────────────────────────────────────────────────────────────────
router.get('/dashboard/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getDashboard);

router.get('/dashboard/:userId/profile',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getFullProfile);

// ── Profile ───────────────────────────────────────────────────────────────────
router.get('/profile/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getProfile);

router.put('/profile/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateProfile);

router.put('/profile/:userId/picture',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  uploadProfilePicture);

router.put('/profile/:userId/budget',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateBudget);

router.put('/profile/:userId/budget-period',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateBudgetPeriod);

router.put('/profile/:userId/password',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  changePassword);

router.delete('/profile/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  deleteAccount);

// ── Notifications ─────────────────────────────────────────────────────────────
router.get('/notifications/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getNotifications);

router.put('/notifications/:userId/settings',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateNotificationSettings);

// read-all must come before /:notificationId/read to avoid Express swallowing it
router.put('/notifications/:userId/read-all',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  markAllRead);

router.put('/notifications/:userId/:notificationId/read',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  markRead);

router.post('/notifications/daily/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  triggerDailyReminder);

// ── Announcements (read-only, active only) ────────────────────────────────────
router.get('/announcements',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard,
  getUserAnnouncements);

// ── Recurring Transactions ────────────────────────────────────────────────────
router.get('/recurring/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getRecurring);

router.post('/recurring/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  createRecurring);

router.put('/recurring/:userId/:recurringId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateRecurring);

router.put('/recurring/:userId/:recurringId/cancel',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  cancelRecurring);

router.delete('/recurring/:userId/:recurringId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  deleteRecurring);

router.post('/recurring/:userId/:recurringId/pay',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  markRecurringAsPaid);

router.post('/recurring/:userId/:recurringId/dismiss',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  dismissRecurring);

// ── Export ────────────────────────────────────────────────────────────────────
router.post('/export/transactions/:userId/pdf',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  exportTransactionsPDF);

// ── Backup & Restore ──────────────────────────────────────────────────────────
router.post('/backup/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  createBackup);

router.get('/backup/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  listBackups);

router.post('/backup/:userId/restore/:backupId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  restoreBackup);

router.delete('/backup/:userId/:backupId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  deleteBackup);

// ── App Lock ──────────────────────────────────────────────────────────────────
router.get('/app-lock/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getAppLock);

router.put('/app-lock/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  setAppLock);

router.post('/app-lock/:userId/verify',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  verifyPin);

// ── Categories ────────────────────────────────────────────────────────────────
router.get('/categories/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getCategories);

router.post('/categories/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  addCategory);

router.put('/categories/:userId/:categoryId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  updateCategory);

router.delete('/categories/:userId/:categoryId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  deleteCategory);

// ── AI ────────────────────────────────────────────────────────────────────────
// health is public — no auth required
router.get('/ai/health', checkHealth);

router.post('/ai/chat/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  chatWithAI);

router.delete('/ai/conversation/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  clearConversation);

router.get('/ai/history/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getChatHistory);

router.get('/ai/insights/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  generateInsights);

router.post('/ai/history/save/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  saveConversationHistory);

// list must come before get/:historyId to avoid shadowing
router.get('/ai/history/list/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getConversationHistory);

router.get('/ai/history/get/:userId/:historyId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getConversationById);

router.delete('/ai/history/:userId/:historyId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  deleteConversationHistory);

export default router;

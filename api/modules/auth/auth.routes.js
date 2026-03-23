import express from 'express';
const router   = express.Router();
import { verifyToken } from '../../middleware/mobileAuthMiddleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { signup, login, completeOnboarding,
  logout, forgotPassword, resetPassword, } from './auth.controller.js';

// ── Public (no token required) ────────────────────────────────────────────────
router.post('/signup',          signup);
router.post('/login',           login);
router.post('/logout',          verifyToken, authorizeRoles('user'), logout);
router.post('/onboarding',      completeOnboarding);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password',  resetPassword);

// ── Light profile check removed ───────────────────────────────────────────────
// GET /api/profile/:userId was here but it shadowed the full getProfile handler
// in profile.controller.js (mounted via mobileUserRoutes).  Express matched this
// stub first and returned only { success, onboardingCompleted } — never reaching
// the real handler that returns all profile stats.
// The full getProfile in profile.controller.js covers onboardingCompleted too.

export default router;

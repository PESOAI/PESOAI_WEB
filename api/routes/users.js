// api/routes/users.js
// User directory and analytics endpoints.
import express from 'express';
import {
  getUsers, getUserById, updateUser, pingActive,
  getUserAvatar, updateUserAvatar,
  getKpis, getTopCategories, getHighRisk,
  getMonthlyTrend, getSavingsDistribution,
} from '../controllers/userController.js';
import { verifyToken } from '../middleware/authMiddleware.js';
import {
  validateUserIdParam,
  validateUpdateUser,
  validateUpdateUserAvatar,
  validateRiskLevelQuery,
  validatePeriodQuery,
} from '../validators/userValidator.js';

const router = express.Router();

router.get('/users',                      verifyToken, getUsers);
router.get('/users/:id',                  verifyToken, validateUserIdParam, getUserById);
router.get('/users/:id/avatar',           verifyToken, validateUserIdParam, getUserAvatar);
router.patch('/users/:id',                verifyToken, validateUpdateUser, updateUser);
router.put('/users/:id/avatar',           verifyToken, validateUpdateUserAvatar, updateUserAvatar);
router.post('/users/:id/active',          verifyToken, validateUserIdParam, pingActive);
router.get('/admin/kpis',                 verifyToken, getKpis);
router.get('/admin/top-categories',       verifyToken, getTopCategories);
router.get('/admin/high-risk',            verifyToken, validateRiskLevelQuery, getHighRisk);
router.get('/admin/monthly-trend',        verifyToken, validatePeriodQuery, getMonthlyTrend);
router.get('/admin/savings-distribution', verifyToken, validatePeriodQuery, getSavingsDistribution);

export default router;

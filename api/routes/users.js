import express from 'express';
import {
  getUsers, getUserById, updateUser, pingActive,
  getKpis, getTopCategories, getHighRisk,
  getMonthlyTrend, getSavingsDistribution,
} from '../controllers/userController.js';

const router = express.Router();

router.get('/users',                      getUsers);
router.get('/users/:id',                  getUserById);
router.patch('/users/:id',                updateUser);
router.post('/users/:id/active',          pingActive);
router.get('/admin/kpis',                 getKpis);
router.get('/admin/top-categories',       getTopCategories);
router.get('/admin/high-risk',            getHighRisk);
router.get('/admin/monthly-trend',        getMonthlyTrend);
router.get('/admin/savings-distribution', getSavingsDistribution);

export default router;
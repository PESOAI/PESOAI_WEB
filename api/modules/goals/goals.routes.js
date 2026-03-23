import express from 'express';
const router   = express.Router();
import { verifyToken, authorizeOwner, authorizeOwnerBody } from '../../middleware/mobileAuthMiddleware.js';
import { authorizeRoles } from '../../middleware/role.middleware.js';
import { maintenanceGuard } from '../../middleware/maintenance.middleware.js';
import { accountGuard } from '../../middleware/accountGuard.middleware.js';
import { addGoal, getUserGoals, getGoalContributions, getUserProgress,
  getGoal, editGoal, contributeToGoal, removeGoal, } from './goals.controller.js';

// POST /api/goals — userId comes from body
router.post('/goals',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwnerBody,
  addGoal);

// progress must come before /:userId to avoid route shadowing
router.get('/goals/progress/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getUserProgress);

router.get('/goals/:userId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getUserGoals);

router.get('/goals/:userId/:goalId/contributions',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getGoalContributions);

router.get('/goals/:userId/:goalId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  getGoal);

router.put('/goals/:userId/:goalId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  editGoal);

router.post('/goals/:userId/:goalId/contribute',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  contributeToGoal);

router.delete('/goals/:userId/:goalId',
  verifyToken, authorizeRoles('user'), maintenanceGuard, accountGuard, authorizeOwner,
  removeGoal);

export default router;

// api/validators/userValidator.js
// Users/admin analytics route validation and sanitization chains.
import { body, param, query } from 'express-validator';
import { handleValidation } from '../middleware/validationMiddleware.js';

export const validateUserIdParam = [
  param('id').isInt({ min: 1 }).withMessage('User id must be a positive integer').toInt(),
  handleValidation,
];

export const validateUpdateUser = [
  param('id').isInt({ min: 1 }).withMessage('User id must be a positive integer').toInt(),
  body('onboarding_completed')
    .optional()
    .isBoolean().withMessage('onboarding_completed must be boolean'),
  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('email must be a valid email address')
    .normalizeEmail(),
  body('location')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('location must be between 2 and 100 characters')
    .escape(),
  handleValidation,
];

export const validateUpdateUserAvatar = [
  param('id').isInt({ min: 1 }).withMessage('User id must be a positive integer').toInt(),
  body('avatar_url')
    .optional({ nullable: true })
    .trim()
    .isLength({ max: 2000 }).withMessage('avatar_url must be at most 2000 characters')
    .custom((value) => {
      if (!value) return true;
      if (/^data:image\//i.test(value)) return true;
      try {
        const parsed = new URL(value);
        return ['http:', 'https:'].includes(parsed.protocol);
      } catch {
        return false;
      }
    }).withMessage('avatar_url must be a valid http(s) URL or data URI'),
  handleValidation,
];

export const validateRiskLevelQuery = [
  query('risk_level')
    .optional()
    .trim()
    .isIn(['all', 'High', 'Medium', 'Low']).withMessage('risk_level must be one of: all, High, Medium, Low'),
  handleValidation,
];

export const validatePeriodQuery = [
  query('period')
    .optional()
    .trim()
    .isIn(['daily', 'weekly', 'monthly']).withMessage('period must be one of: daily, weekly, monthly'),
  handleValidation,
];

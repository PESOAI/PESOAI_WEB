// api/validators/logValidator.js
// System log route validation and sanitization chains.
import { body } from 'express-validator';
import { handleValidation } from '../middleware/validationMiddleware.js';
import { LOG_TYPES } from '../constants/index.js';

export const validateCreateLog = [
  body('type')
    .trim()
    .isIn(Object.values(LOG_TYPES)).withMessage(`type must be one of: ${Object.values(LOG_TYPES).join(', ')}`),
  body('user_name')
    .trim()
    .notEmpty().withMessage('user_name is required')
    .isLength({ min: 2, max: 100 }).withMessage('user_name must be between 2 and 100 characters')
    .escape(),
  body('message')
    .trim()
    .notEmpty().withMessage('message is required')
    .isLength({ min: 3, max: 400 }).withMessage('message must be between 3 and 400 characters')
    .escape(),
  handleValidation,
];

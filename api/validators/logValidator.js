import { body } from 'express-validator';
import { handleValidation } from '../middleware/validationMiddleware.js';
import { LOG_TYPES } from '../constants/index.js';

export const validateCreateLog = [
  body('type').trim()
    .isIn(Object.values(LOG_TYPES)).withMessage(`type must be one of: ${Object.values(LOG_TYPES).join(', ')}`),
  body('user_name').trim().notEmpty()
    .isLength({ min: 2, max: 100 }).withMessage('user_name must be 2-100 characters').escape(),
  body('message').trim().notEmpty()
    .isLength({ min: 3, max: 400 }).withMessage('message must be 3-400 characters').escape(),
  handleValidation,
];

export const validateMobileErrorLog = [
  body('source').trim().notEmpty()
    .isLength({ min: 2, max: 100 }).withMessage('source must be 2-100 characters').escape(),
  body('category').trim().notEmpty()
    .isIn(['api', 'exception', 'crash']).withMessage('category must be one of: api, exception, crash'),
  body('severity').optional({ nullable: true }).trim()
    .isIn(['error', 'warning', 'info']).withMessage('severity must be one of: error, warning, info'),
  body('message').trim().notEmpty()
    .isLength({ min: 3, max: 500 }).withMessage('message must be 3-500 characters').escape(),
  body('code').optional({ nullable: true }).trim()
    .isLength({ min: 1, max: 100 }).withMessage('code must be 1-100 characters').escape(),
  body('statusCode').optional({ nullable: true })
    .isInt({ min: 100, max: 599 }).withMessage('statusCode must be a valid HTTP status code').toInt(),
  body('userId').optional({ nullable: true })
    .isUUID().withMessage('userId must be a valid UUID'),
  body('appVersion').trim().notEmpty()
    .isLength({ min: 1, max: 50 }).withMessage('appVersion must be 1-50 characters').escape(),
  body('appVersionCode')
    .isInt({ min: 0 }).withMessage('appVersionCode must be a non-negative integer').toInt(),
  body('buildType').trim().notEmpty()
    .isIn(['debug', 'release', 'unknown']).withMessage('buildType must be one of: debug, release, unknown'),
  body('deviceModel').trim().notEmpty()
    .isLength({ min: 2, max: 120 }).withMessage('deviceModel must be 2-120 characters').escape(),
  body('osVersion').trim().notEmpty()
    .isLength({ min: 2, max: 100 }).withMessage('osVersion must be 2-100 characters').escape(),
  body('details').optional({ nullable: true }).trim()
    .isLength({ max: 2000 }).withMessage('details must be 0-2000 characters').escape(),
  body('occurredAt').optional({ nullable: true })
    .isInt({ min: 0 }).withMessage('occurredAt must be a valid unix timestamp in milliseconds').toInt(),
  handleValidation,
];

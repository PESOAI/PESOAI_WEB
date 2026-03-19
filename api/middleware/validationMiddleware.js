// api/middleware/validationMiddleware.js
// Shared express-validator result handling and sanitization constraints.
import { validationResult } from 'express-validator';

export const handleValidation = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  return res.status(422).json({
    status: 'validation_error',
    errors: result.array().map((e) => ({
      field: e.path,
      message: e.msg,
      value: e.value,
      location: e.location,
    })),
  });
};


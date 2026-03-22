export const sendSuccess = (res, data = {}, message = 'OK', status = 200, extras = {}) =>
  res.status(status).json({
    success: true,
    data,
    message,
    errors: [],
    ...extras,
  });

export const sendError = (res, status = 500, message = 'Request failed', errors = [], extras = {}) =>
  res.status(status).json({
    success: false,
    data: {},
    message,
    errors: Array.isArray(errors) ? errors : [errors],
    ...extras,
  });

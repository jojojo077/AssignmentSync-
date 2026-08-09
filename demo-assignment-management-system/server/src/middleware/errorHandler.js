const { nodeEnv } = require('../config/env');

/**
 * Custom error class so services/controllers can throw errors with
 * an explicit HTTP status instead of always defaulting to 500.
 *   throw new ApiError(404, 'Assignment not found');
 */
class ApiError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

// Catches unmatched routes and forwards a 404 into the error handler below.
function notFoundHandler(req, res, next) {
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));
}

// Express recognises this as an error handler because it has 4 args.
// Keep it last in the middleware chain (see app.js).
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const payload = {
    error: {
      message: err.message || 'Internal server error',
    },
  };

  if (err.details) payload.error.details = err.details;
  if (nodeEnv !== 'production' && err.stack) payload.error.stack = err.stack;

  if (statusCode >= 500) {
    // eslint-disable-next-line no-console
    console.error(err);
  }

  res.status(statusCode).json(payload);
}

module.exports = { ApiError, notFoundHandler, errorHandler };

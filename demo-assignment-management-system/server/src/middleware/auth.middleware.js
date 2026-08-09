const { ApiError } = require('./errorHandler');

/**
 * Placeholder JWT auth guard.
 * Wire up jsonwebtoken here once the auth.controller login flow is built:
 *
 *   const jwt = require('jsonwebtoken');
 *   const { jwtSecret } = require('../config/env');
 *   const decoded = jwt.verify(token, jwtSecret);
 *   req.user = decoded;
 *
 * Left intentionally simple so it's obvious where real auth plugs in.
 */
function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  // TODO: verify JWT, attach decoded user to req.user
  req.user = { id: 'placeholder-user-id' };
  next();
}

module.exports = { requireAuth };

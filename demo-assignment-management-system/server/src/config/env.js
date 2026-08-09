require('dotenv').config();

/**
 * Centralised environment configuration.
 * Import this instead of reading process.env directly elsewhere,
 * so there's one place to see every config value the app depends on.
 */
const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT, 10) || 5000,

  // Canvas LMS API (see https://instructure.github.io/)
  canvas: {
    baseUrl: process.env.CANVAS_BASE_URL || '',
    // Personal access token for now (dev/testing). Swap for OAuth2
    // authorization-code flow before this touches real student accounts.
    accessToken: process.env.CANVAS_ACCESS_TOKEN || '',
  },

  // Auth
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',

  // CORS
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
};

module.exports = env;

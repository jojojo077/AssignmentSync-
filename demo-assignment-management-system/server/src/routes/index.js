const express = require('express');

const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const canvasRoutes = require('./canvas.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/canvas', canvasRoutes);

// Add as they're built: assignments.routes.js (progress tracking),
// notifications.routes.js, reports.routes.js

module.exports = router;

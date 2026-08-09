const express = require('express');
const { requireAuth } = require('../middleware/auth.middleware');
const { listCourses, listUpcomingAssignments } = require('../controllers/canvas.controller');

const router = express.Router();

router.get('/courses', requireAuth, listCourses);
router.get('/assignments', requireAuth, listUpcomingAssignments);

module.exports = router;

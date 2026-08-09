const canvasService = require('../services/canvasService');

async function listCourses(req, res, next) {
  try {
    const courses = await canvasService.getCourses();
    res.json(courses);
  } catch (err) {
    next(err);
  }
}

async function listUpcomingAssignments(req, res, next) {
  try {
    const data = await canvasService.getAllUpcomingAssignments();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

module.exports = { listCourses, listUpcomingAssignments };

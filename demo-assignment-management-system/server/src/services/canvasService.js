const axios = require('axios');
const { canvas } = require('../config/env');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Thin wrapper around the Canvas LMS REST API.
 * Docs: https://canvas.instructure.com/doc/api/ (also linked from
 * https://instructure.github.io/)
 *
 * Auth model right now: a single access token from .env (fine for local
 * dev against your own Canvas account). Before this ships to real users,
 * swap to Canvas's OAuth2 authorization-code flow so each student
 * authorises their own account and we store per-user tokens instead of
 * one shared token.
 */
function client(accessToken) {
  const token = accessToken || canvas.accessToken;

  if (!canvas.baseUrl || !token) {
    throw new ApiError(
      500,
      'Canvas API is not configured. Set CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN in server/.env'
    );
  }

  return axios.create({
    baseURL: `${canvas.baseUrl}/api/v1`,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 10000,
  });
}

/** GET /courses — courses the current user is enrolled in */
async function getCourses(accessToken) {
  const { data } = await client(accessToken).get('/courses', {
    params: { enrollment_state: 'active', per_page: 100 },
  });
  return data;
}

/** GET /courses/:id/assignments — assignments for a single course */
async function getAssignmentsForCourse(courseId, accessToken) {
  const { data } = await client(accessToken).get(`/courses/${courseId}/assignments`, {
    params: { per_page: 100, order_by: 'due_at' },
  });
  return data;
}

/**
 * Fetch active courses, then fan out to fetch each course's assignments,
 * and flatten into one list. This is what feeds the "aggregate workload
 * across all papers" dashboard requirement.
 */
async function getAllUpcomingAssignments(accessToken) {
  const courses = await getCourses(accessToken);

  const assignmentLists = await Promise.all(
    courses.map((course) =>
      getAssignmentsForCourse(course.id, accessToken).catch(() => [])
      // a single course failing (e.g. no assignment permissions) shouldn't
      // take down the whole aggregate view
    )
  );

  return courses.map((course, i) => ({
    courseId: course.id,
    courseName: course.name,
    assignments: assignmentLists[i],
  }));
}

module.exports = { getCourses, getAssignmentsForCourse, getAllUpcomingAssignments };

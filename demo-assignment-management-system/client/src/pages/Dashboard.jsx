import { useEffect, useState } from 'react';
import { canvas } from '../services/api';

/**
 * Overview of upcoming assignments, deadlines, and workload.
 * Currently renders placeholder state — wire up to GET /api/canvas/assignments
 * once Canvas credentials are configured in server/.env.
 */
export default function Dashboard() {
  const [assignments, setAssignments] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    canvas
      .getUpcomingAssignments()
      .then((res) => {
        if (!cancelled) {
          setAssignments(res.data);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section>
      <h1>Dashboard</h1>
      <p>Upcoming assignments, workload summary, and recent announcements will live here.</p>

      {status === 'loading' && <p>Loading assignments…</p>}
      {status === 'error' && (
        <p role="alert">
          Couldn&rsquo;t load assignments. Check that the server is running and Canvas is
          configured in server/.env.
        </p>
      )}
      {status === 'ready' && assignments.length === 0 && <p>No courses found.</p>}

      {status === 'ready' && (
        <ul>
          {assignments.map((course) => (
            <li key={course.courseId}>
              <strong>{course.courseName}</strong> — {course.assignments.length} assignment(s)
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

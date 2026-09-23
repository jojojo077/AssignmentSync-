
import { useState, useEffect } from 'react';
import { canvas } from '../services/api';

function ProgressBar({ completed, overdue, uncompleted, total })
{
    const x = (n) => (total === 0 ? 0 : (n / total) * 100);
    return (
        <div style={{ display: 'flex', height: '8px', borderRadius: '4px', overflow: 'hidden', background: 'eee' }}>
            <div style={{ width: `${x(completed)}%`, background: '#2e7d32' }} />
            <div style={{ width: `${x(overdue)}%`, background: '#c62828' }} />
            <div style={{ width: `${x(uncompleted)}%`, background: '#9e9e9e' }} />
        </div>
    );
}

function CourseSection({ course })
{
    const pctComplete = course.totalCount === 0 ? 0 : Math.round((course.completedCount / course.totalCount) * 100);

    return (
        <details className="dashboard-card" style={{ marginBottom: '1rem' }}>
            <summary style={{ cursor: 'pointer', padding: '0.75rem 1rem' }}>
                <strong> {course.courseName}</strong> - {pctComplete}% complete
            </summary>

            <div style={{ padding: '0 1rem 1rem' }}>
                <ProgressBar
                    completed={course.completedCount}
                    overdue={course.overdueCount}
                    uncompleted={course.uncompletedCount}
                    total={course.totalCount}
                />

                <ul className="dashboard-assignment-sublist" style={{ marginTop: '0.75rem' }}>
                    {course.assignments.map((a) => (
                        <li key={a.id}>{a.name}</li>
                    ))}
                </ul>
            </div>
        </details>
    );
}
export default function Assignments() {

    const [courses, setCourses] = useState([]);
    const [status, setStatus] = useState('idle');

    useEffect(() => {
        let cancelled = false;
        setStatus('loading');

        canvas.getAssignmentProgress().then((res) => {
            if (!cancelled) {
                setCourses(res.data || []);
                setStatus('ready');
            }
        }).catch(() => { if (!cancelled) setStatus('error'); });

        return () => { cancelled = true; };
    }, []);

    if (status === 'loading') return <p>Loading...</p>;
    if (status === 'error') return <p role="alert">Couldn't load assignment progress.</p>;

    return courses.map((c) => <CourseSection key={c.courseId} course={c} />);

}

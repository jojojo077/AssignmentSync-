
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

function groupByStatus(assignments) {
    return {
        completed: assignments.filter((a) => a.status === 'Completed'),
        overdue: assignments.filter((a) => a.status === 'Overdue'),
        uncompleted: assignments.filter((a) => a.status === 'Uncompleted'),
    }
}

function AssignmentGroup({ title, colorClass, items }) {
    if (items.length === 0) return null;
    return (
        <div className="assignment-group">
            <h4 className={colorClass}>{title} ({items.length})</h4>
            <ul className="dashboard-assignment-sublist">
                {items.map(({ assignment }) => (
                    <li key={assignment.id} > {assignment.name} </li>))}
            </ul>
        </div>
    );
}
function CourseSection({ course })
{
    const { completed, overdue, uncompleted } = groupByStatus(course.assignments);
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
                <AssignmentGroup title="Overdue" colorClass="text-red" items={overdue} />
                <AssignmentGroup title="Uncompleted" colorClass="text-gray" items={uncompleted} />
                <AssignmentGroup title="Completed" colorClass="text-green" items={completed} />
                
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


    return (
        <section>
            <h1>Workload Summary</h1>
            <p>Expand a course to see a breakdown of completed and uncompleted assignments.</p>

            {status === 'loading' && <p>Loading...</p>}
            {status === 'error' && <p role="alert">Couldn't load assignment progress.</p>}
            {status === 'ready' && courses.map((c) => <CourseSection key={c.courseId} course={c} />)}
        </section>
    );
}

import { useState, useEffect } from 'react';
import { canvas } from '../services/api';

/**
 * Search page - looks up assignments for a course code (e.g. "ENSE707")
 * and lists the user's active course codes as a hint.
 */
export default function SearchAssignments() {
    const [courseCode, setCourseCode] = useState('');
    const [results, setResults] = useState([]);
    // Search request state: idle | loading | error | ready
    const [status, setStatus] = useState('idle');
    const [errorMessage, setErrorMessage] = useState('');

    // Active courses, shown under the search box as examples of valid codes.
    const [activeCourses, setActiveCourses] = useState([]);
    const [activeCoursesStatus, setActiveCoursesStatus] = useState('idle');

    // Load the active course list once on mount; `cancelled` guards against updates after unmount.
    useEffect(() => {
        let cancelled = false;
        setActiveCoursesStatus('loading');

        canvas
            .getCourses()
            .then((res) => {
                if (!cancelled) {
                    setActiveCourses(res.data || []);
                    setActiveCoursesStatus('ready');
                }
            })
            .catch(() => {
                if (!cancelled) setActiveCoursesStatus('error');
            });

        return () => {
            cancelled = true;
        };
    }, []);

    // Run the search for the trimmed course code; ignores empty input.
    async function handleSubmit(e) {
        e.preventDefault();

        const trimmed = courseCode.trim();
        if (!trimmed) return;

        setStatus('loading');
        try {
            const res = await canvas.searchAssignmentsByCourseCode(trimmed);
            setResults(res.data || []);
            setStatus('ready');
        } catch (err) {
            setErrorMessage(err.response?.data?.message || 'Search failed. Check the server is running.');
            setStatus('error');
        }
    }

    return (
        <section>
            <h1>Search Assignments by Course Code</h1>
            <p>Look up assignments for a specific paper, e.g. "ENSE707".</p>

            <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '0.5rem', margin: '1rem 0' }}>
                <input
                    type="text"
                    value={courseCode}
                    onChange={(e) => setCourseCode(e.target.value)}
                    placeholder="Course code"
                    aria-label="Course code"
                    style={{ width: '28ch', padding: '0.5rem', boxSizing: 'border-box' }}
                />
                <button type="submit" disabled={status === 'loading' || !courseCode.trim()}>
                    {status === 'loading' ? 'Searching...' : 'Search'}
                </button>
            </form>

            {/* Hint listing the user's active course codes */}
            {activeCoursesStatus === 'ready' && activeCourses.length > 0 && (
                <p style={{ fontSize: '0.85rem', opacity: 0.85, marginTop: '-0.5rem', marginBottom: '1rem' }}>
                    Active Courses: {' '}<b>
                    {activeCourses
                        .map((c) => c.course_code)
                        .filter(Boolean)
                        .join(', ')}
                    </b></p>
            )}

            {/* Results panel - content depends on the search status */}
            <div className="dashboard-card">
                <div className="dashboard-card__content">
                    {status === 'idle' && (
                        <div className="dashboard-empty-state">
                            <p>Enter a course code above to see its assignments.</p>
                        </div>
                    )}

                    {status === 'loading' && (
                        <div className="dashboard-status-state">
                            <p>Searching...</p>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="dashboard-alert-banner" role="alert">
                            <p>{errorMessage}</p>
                        </div>
                    )}

                    {status === 'ready' && results.length === 0 && (
                        <div className="dashboard-empty-state">
                            <p>No courses matched "{courseCode.trim()}".</p>
                        </div>
                    )}

                    {status === 'ready' && results.length > 0 && (
                        <ul className="dashboard-course-list">
                            {results.map((course) => (
                                <li key={course.courseId} className="dashboard-course-item">
                                    <div className="dashboard-course-item__main">
                                        <span className="dashboard-course-item__title">
                                            <strong>{course.courseName}</strong> - {course.assignments.length} assignment(s)
                                        </span>
                                    </div>

                                    {course.assignments.length > 0 && (
                                        <div className="dashboard-assignment-sublist">
                                            {course.assignments.map((item) => (
                                                <div key={item.id} className="dashboard-assignment-subitem">
                                                    <span className="dashboard-assignment-subitem__bullet" />
                                                    <span className="dashboard-assignment-subitem__name">
                                                        {item.html_url ? (
                                                            <a href={item.html_url} target="_blank" rel="noreferrer noopener">
                                                                {item.name}
                                                            </a>
                                                        ) : (
                                                            item.name
                                                        )}
                                                    </span>
                                                    {item.due_at && (
                                                        <span className="dashboard-assignment-subitem__date">
                                                            Due{' '}
                                                            {new Date(item.due_at).toLocaleDateString('en-US', {
                                                                month: 'short',
                                                                day: 'numeric',
                                                                year: 'numeric',
                                                                // Canvas due dates are UTC; format in UTC so the day doesn't shift.
                                                                timeZone: 'UTC',
                                                            })}
                                                        </span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </section>
    );
}

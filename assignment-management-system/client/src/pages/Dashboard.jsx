import { useEffect, useState } from 'react';
import { canvas } from '../services/api';

/**
 * Strips HTML tags and unescapes common entities for a clean text preview.
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * Formats ISO date string into human-readable relative or calendar date.
 */
function formatAnnouncementDate(dateString) {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '';
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (diffDays > 1 && diffDays < 7) {
    return `${diffDays} days ago`;
  }
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

/**
 * Overview of upcoming assignments, deadlines, and recent announcements.
 */
export default function Dashboard() {
  const [assignments, setAssignments] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsStatus, setAnnouncementsStatus] = useState('idle'); // idle | loading | error | ready
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    canvas
      .getUpcomingAssignments()
      .then((res) => {
        if (!cancelled) {
          setAssignments(res.data || []);
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    // Safely fetch announcements if API method exists
    if (canvas && typeof canvas.getAnnouncements === 'function') {
      setAnnouncementsStatus('loading');
      canvas
        .getAnnouncements()
        .then((res) => {
          if (!cancelled) {
            setAnnouncements(res.data || []);
            setAnnouncementsStatus('ready');
          }
        })
        .catch(() => {
          if (!cancelled) setAnnouncementsStatus('error');
        });
    } else {
      setAnnouncementsStatus('ready');
    }

    return () => {
      cancelled = true;
    };
  }, []);

  const totalAssignments = assignments.reduce(
    (acc, curr) => acc + (curr.assignments ? curr.assignments.length : 0),
    0
  );

  return (
    <section className="dashboard-page">
      <header className="dashboard-header">
        <div>
          <h1>Dashboard</h1>
          <p className="dashboard-header__subtitle">
            Upcoming assignments, workload summary, and recent announcements will live here.
          </p>
        </div>

        {status === 'ready' && (
          <div className="dashboard-stats-strip">
            <div className="dashboard-stat-badge">
              <span className="dashboard-stat-badge__val">{assignments.length}</span>
              <span className="dashboard-stat-badge__lbl">Active Courses</span>
            </div>
            <div className="dashboard-stat-badge">
              <span className="dashboard-stat-badge__val">{totalAssignments}</span>
              <span className="dashboard-stat-badge__lbl">Assignments</span>
            </div>
            <div className="dashboard-stat-badge">
              <span className="dashboard-stat-badge__val">{announcements.length}</span>
              <span className="dashboard-stat-badge__lbl">Announcements</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid: Left column for Course Workload/Assignments, Right column for Recent Announcements */}
      <div className="dashboard-grid">
        {/* Left Column: Course Workload & Upcoming Assignments */}
        <div className="dashboard-column dashboard-column--main">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__title">
                <span className="dashboard-card__icon" aria-hidden="true">📚</span>
                Course Workload & Assessments
              </h2>
              {status === 'ready' && (
                <span className="dashboard-card__count-tag">
                  {assignments.length} {assignments.length === 1 ? 'course' : 'courses'}
                </span>
              )}
            </div>

            <div className="dashboard-card__content">
              {status === 'loading' && (
                <div className="dashboard-status-state">
                    <p>Loading assignments...</p>
                </div>
              )}

              {status === 'error' && (
                <div className="dashboard-alert-banner" role="alert">
                  <p>
                    Couldn&rsquo;t load assignments. Check that the server is running (
                    <code>dotnet run</code> in <code>server/</code>) and that Canvas is configured via{' '}
                    <code>dotnet user-secrets</code>.
                  </p>
                </div>
              )}

              {status === 'ready' && assignments.length === 0 && (
                <div className="dashboard-empty-state">
                  <p>No courses found.</p>
                </div>
              )}

              {status === 'ready' && assignments.length > 0 && (
                <ul className="dashboard-course-list">
                  {assignments.map((course) => (
                    <li key={course.courseId} className="dashboard-course-item">
                      <div className="dashboard-course-item__main">
                        <span className="dashboard-course-item__title">
                          <strong>{course.courseName}</strong> - {course.assignments.length} assignment(s)
                        </span>
                      </div>

                      {course.assignments && course.assignments.length > 0 && (
                        <div className="dashboard-assignment-sublist">
                          {course.assignments.slice(0, 3).map((item) => (
                            <div key={item.id} className="dashboard-assignment-subitem">
                              <span className="dashboard-assignment-subitem__bullet" />
                              <span className="dashboard-assignment-subitem__name">{item.name}</span>
                              {item.due_at && (
                                <span className="dashboard-assignment-subitem__date">
                                  Due {new Date(item.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                </span>
                              )}
                            </div>
                          ))}
                          {course.assignments.length > 3 && (
                            <div className="dashboard-assignment-subitem__more">
                              + {course.assignments.length - 3} more assignment(s)
                            </div>
                          )}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Recent Announcements Column */}
        <aside className="dashboard-column dashboard-column--announcements" aria-label="Recent Announcements">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__title">
                <span className="dashboard-card__icon" aria-hidden="true">📢</span>
                Recent Announcements
              </h2>
              {announcementsStatus === 'ready' && announcements.length > 0 && (
                <span className="dashboard-card__count-tag">{announcements.length} new</span>
              )}
            </div>

            <div className="dashboard-card__content">
              {announcementsStatus === 'loading' && (
                <div className="dashboard-status-state">
                  <p>Loading announcements...</p>
                </div>
              )}

              {announcementsStatus === 'error' && (
                <div className="dashboard-alert-banner dashboard-alert-banner--subtle">
                  <p>Could not load announcements at this time.</p>
                </div>
              )}

              {announcementsStatus === 'ready' && announcements.length === 0 && (
                <div className="dashboard-empty-state">
                  <span className="dashboard-empty-state__icon" aria-hidden="true">📭</span>
                  <p>No recent announcements</p>
                  <span className="dashboard-empty-state__sub">
                    Course announcements from Canvas will appear here.
                  </span>
                </div>
              )}

              {announcementsStatus === 'ready' && announcements.length > 0 && (
                <div className="announcements-feed">
                  {announcements.map((item) => {
                    const cleanSnippet = stripHtml(item.message);
                    return (
                      <article key={item.id} className="announcement-item">
                        <div className="announcement-item__top">
                          {item.courseName && (
                            <span className="announcement-item__course-badge" title={item.courseName}>
                              {item.courseName}
                            </span>
                          )}
                          {item.posted_at && (
                            <time className="announcement-item__date" dateTime={item.posted_at}>
                              {formatAnnouncementDate(item.posted_at)}
                            </time>
                          )}
                        </div>

                        <h3 className="announcement-item__title">
                          <button
                            type="button"
                            className="announcement-item__title-btn"
                            onClick={() => setSelectedAnnouncement(item)}
                          >
                            {item.title || 'Untitled Announcement'}
                          </button>
                        </h3>

                        {item.user_name && (
                          <div className="announcement-item__author">
                            <span>Posted by {item.user_name}</span>
                          </div>
                        )}

                        {cleanSnippet && (
                          <p className="announcement-item__snippet">
                            {cleanSnippet.length > 140 ? `${cleanSnippet.substring(0, 140)}...` : cleanSnippet}
                          </p>
                        )}

                        <div className="announcement-item__footer">
                          <button
                            type="button"
                            className="announcement-item__read-btn"
                            onClick={() => setSelectedAnnouncement(item)}
                          >
                            Read full announcement →
                          </button>

                          {item.html_url && (
                            <a
                              href={item.html_url}
                              target="_blank"
                              rel="noreferrer noopener"
                              className="announcement-item__canvas-link"
                              title="Open on Canvas LMS"
                            >
                              Canvas ↗
                            </a>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>

      {/* Announcement Detail Modal */}
      {selectedAnnouncement && (
        <div
          className="announcement-modal-backdrop"
          role="dialog"
          aria-modal="true"
          aria-labelledby="announcement-modal-title"
          onClick={() => setSelectedAnnouncement(null)}
        >
          <div
            className="announcement-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="announcement-modal__header">
              <div>
                {selectedAnnouncement.courseName && (
                  <span className="announcement-item__course-badge">
                    {selectedAnnouncement.courseName}
                  </span>
                )}
                <h2 id="announcement-modal-title" className="announcement-modal__title">
                  {selectedAnnouncement.title || 'Announcement'}
                </h2>
                <div className="announcement-modal__meta">
                  {selectedAnnouncement.user_name && (
                    <span>By {selectedAnnouncement.user_name}</span>
                  )}
                  {selectedAnnouncement.posted_at && (
                    <span>• {formatAnnouncementDate(selectedAnnouncement.posted_at)}</span>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="announcement-modal__close-btn"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            <div className="announcement-modal__body">
              {/* Sanitized or text content */}
              <div
                className="announcement-modal__text"
                dangerouslySetInnerHTML={{ __html: selectedAnnouncement.message || '<p>No content provided.</p>' }}
              />
            </div>

            <div className="announcement-modal__footer">
              {selectedAnnouncement.html_url && (
                <a
                  href={selectedAnnouncement.html_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn--secondary"
                >
                  View in Canvas LMS ↗
                </a>
              )}
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => setSelectedAnnouncement(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

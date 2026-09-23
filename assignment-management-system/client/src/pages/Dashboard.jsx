import { useEffect, useState, useMemo } from 'react';
import { canvas, progress } from '../services/api';

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
 * Returns a motivational label based on progress percentage.
 */
function getProgressMotivation(pct) {
  if (pct === 100) return { label: '🎉 All caught up!', className: 'progress-motivation--complete' };
  if (pct >= 75) return { label: '🔥 Great progress!', className: 'progress-motivation--great' };
  if (pct >= 50) return { label: '💪 Keep going!', className: 'progress-motivation--good' };
  if (pct >= 25) return { label: '📖 Just getting started', className: 'progress-motivation--early' };
  return { label: '🌱 Let\'s get moving!', className: 'progress-motivation--start' };
}

/**
 * Overview of upcoming assignments, deadlines, and recent announcements.
 */
export default function Dashboard() {
  const [assignments, setAssignments] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready

  const [announcements, setAnnouncements] = useState([]);
  const [announcementsStatus, setAnnouncementsStatus] = useState('idle');
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);

  // Completion state — initialised from localStorage, seeded from Canvas submission flags
  const [completedIds, setCompletedIds] = useState(new Set());

  // Checklist filter: 'all' | 'pending' | 'completed'
  const [checklistFilter, setChecklistFilter] = useState('all');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    // Load the checklist from the authenticated user's file before rendering progress.
    progress
      .getChecklist()
      .then((res) => {
        if (!cancelled) setCompletedIds(new Set((res.data || []).map(String)));
      })
      .catch(() => {
        if (!cancelled) setCompletedIds(new Set());
      });

    canvas
      .getUpcomingAssignments()
      .then((res) => {
        if (!cancelled) {
          const data = res.data || [];
          setAssignments(data);
          setStatus('ready');

          // Seed completed IDs from Canvas has_submitted_submissions if not already stored
          setCompletedIds((prev) => {
            const next = new Set(prev);
            data.forEach((course) => {
              (course.assignments || []).forEach((item) => {
                if (item.has_submitted_submissions && !next.has(String(item.id))) {
                  next.add(String(item.id));
                }
              });
            });
            // Persist Canvas submission seeds in the authenticated user's checklist.
            progress.setChecklist([...next]).catch(() => {});
            return next;
          });
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

  // Toggle an assignment's completed state and persist it for the current user.
  const handleToggleCompleted = (assignmentId) => {
    const idStr = String(assignmentId);
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(idStr)) {
        next.delete(idStr);
      } else {
        next.add(idStr);
      }
      progress.setChecklist([...next]).catch(() => {});
      return next;
    });
  };

  // Aggregate progress calculations
  const progressStats = useMemo(() => {
    const allAssignments = assignments.flatMap((c) => (c.assignments || []).map((a) => ({ ...a, courseName: c.courseName, courseId: c.courseId })));
    const total = allAssignments.length;
    const completed = allAssignments.filter((a) => completedIds.has(String(a.id))).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);

    const perCourse = assignments.map((course) => {
      const courseTotal = (course.assignments || []).length;
      const courseCompleted = (course.assignments || []).filter((a) => completedIds.has(String(a.id))).length;
      const coursePct = courseTotal === 0 ? 0 : Math.round((courseCompleted / courseTotal) * 100);
      return {
        courseId: course.courseId,
        courseName: course.courseName,
        total: courseTotal,
        completed: courseCompleted,
        pct: coursePct,
      };
    });

    return { total, completed, pct, perCourse, allAssignments };
  }, [assignments, completedIds]);

  const totalAssignments = progressStats.total;

  // Filtered assignment list for the checklist section
  const filteredChecklistItems = useMemo(() => {
    return progressStats.allAssignments.filter((a) => {
      if (checklistFilter === 'completed') return completedIds.has(String(a.id));
      if (checklistFilter === 'pending') return !completedIds.has(String(a.id));
      return true;
    });
  }, [progressStats.allAssignments, completedIds, checklistFilter]);

  const motivation = getProgressMotivation(progressStats.pct);

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
            <div className="dashboard-stat-badge dashboard-stat-badge--progress">
              <span className="dashboard-stat-badge__val dashboard-stat-badge__val--green">{progressStats.pct}%</span>
              <span className="dashboard-stat-badge__lbl">Completed</span>
            </div>
            <div className="dashboard-stat-badge">
              <span className="dashboard-stat-badge__val">{announcements.length}</span>
              <span className="dashboard-stat-badge__lbl">Announcements</span>
            </div>
          </div>
        )}
      </header>

      {/* Main Grid: Left = Course Workload, Centre = Progress, Right = Announcements */}
      <div className="dashboard-grid">
        {/* Left Column: Course Workload & Upcoming Assignments */}
        <div className="dashboard-column dashboard-column--main">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__title">
                <span className="dashboard-card__icon" aria-hidden="true">📚</span>
                Course Workload &amp; Assessments
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

        {/* Centre Column: Semester Progress */}
        <section className="dashboard-column dashboard-column--progress" aria-label="Semester Assignment Progress">
          <div className="dashboard-card">
            <div className="dashboard-card__header">
              <h2 className="dashboard-card__title">
                <span className="dashboard-card__icon" aria-hidden="true">📊</span>
                Semester Progress
              </h2>
              {status === 'ready' && (
                <span className="dashboard-card__count-tag dashboard-card__count-tag--green">
                  {progressStats.pct}%
                </span>
              )}
            </div>

            <div className="dashboard-card__content">
              {status === 'loading' && (
                <div className="dashboard-status-state">
                  <p>Loading progress…</p>
                </div>
              )}

              {status === 'error' && (
                <div className="dashboard-alert-banner dashboard-alert-banner--subtle">
                  <p>Could not load progress data.</p>
                </div>
              )}

              {status === 'ready' && progressStats.total === 0 && (
                <div className="dashboard-empty-state">
                  <span className="dashboard-empty-state__icon" aria-hidden="true">✅</span>
                  <p>No assignments to track</p>
                  <span className="dashboard-empty-state__sub">Progress tracking will appear here once assignments are loaded.</span>
                </div>
              )}

              {status === 'ready' && progressStats.total > 0 && (
                <div className="progress-widget">
                  {/* Hero stat */}
                  <div className="progress-widget__hero">
                    <span className="progress-widget__pct" aria-label={`${progressStats.pct} percent complete`}>
                      {progressStats.pct}%
                    </span>
                    <span className="progress-widget__sub">
                      {progressStats.completed} of {progressStats.total} assignments completed this semester
                    </span>
                  </div>

                  {/* Overall progress bar */}
                  <div
                    className="progress-bar-track"
                    role="progressbar"
                    aria-valuenow={progressStats.pct}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label="Semester completion progress"
                  >
                    <div
                      className="progress-bar-fill"
                      style={{ width: `${progressStats.pct}%` }}
                    />
                  </div>

                  {/* Motivational badge */}
                  <div className={`progress-motivation ${motivation.className}`}>
                    {motivation.label}
                  </div>

                  {/* Per-course breakdown */}
                  <div className="course-progress-section">
                    <h3 className="course-progress-section__heading">Per-course breakdown</h3>
                    <ul className="course-progress-list">
                      {progressStats.perCourse.map((cp) => (
                        <li key={cp.courseId} className="course-progress-item">
                          <div className="course-progress-item__top">
                            <span className="course-progress-item__name" title={cp.courseName}>
                              {cp.courseName}
                            </span>
                            <span className="course-progress-item__fraction">
                              {cp.completed}/{cp.total}
                            </span>
                          </div>
                          <div className="course-progress-mini-track">
                            <div
                              className="course-progress-mini-fill"
                              style={{ width: `${cp.pct}%` }}
                            />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Interactive checklist */}
                  <div className="progress-checklist">
                    <div className="progress-checklist__header">
                      <h3 className="progress-checklist__heading">Assignment checklist</h3>
                      <div className="progress-checklist__filters" role="group" aria-label="Filter assignments">
                        {['all', 'pending', 'completed'].map((f) => (
                          <button
                            key={f}
                            type="button"
                            className={`checklist-filter-btn${checklistFilter === f ? ' checklist-filter-btn--active' : ''}`}
                            onClick={() => setChecklistFilter(f)}
                          >
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {filteredChecklistItems.length === 0 ? (
                      <p className="progress-checklist__empty">
                        {checklistFilter === 'completed' ? 'No completed assignments yet.' : 'No pending assignments — great work!'}
                      </p>
                    ) : (
                      <ul className="progress-checklist__list">
                        {filteredChecklistItems.map((item) => {
                          const isDone = completedIds.has(String(item.id));
                          return (
                            <li key={item.id} className={`checklist-item${isDone ? ' checklist-item--done' : ''}`}>
                              <label className="checklist-item__label">
                                <input
                                  type="checkbox"
                                  className="checklist-item__checkbox"
                                  checked={isDone}
                                  onChange={() => handleToggleCompleted(item.id)}
                                  aria-label={`Mark ${item.name} as ${isDone ? 'incomplete' : 'complete'}`}
                                />
                                <span className="checklist-item__name">{item.name}</span>
                              </label>
                              <div className="checklist-item__meta">
                                <span className="checklist-item__course">{item.courseName}</span>
                                {item.due_at && (
                                  <span className="checklist-item__due">
                                    {new Date(item.due_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Right Column: Recent Announcements */}
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
                              ↗ Canvas
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
          onClick={(e) => { if (e.target === e.currentTarget) setSelectedAnnouncement(null); }}
        >
          <div className="announcement-modal">
            <div className="announcement-modal__header">
              <div>
                {selectedAnnouncement.courseName && (
                  <span className="announcement-item__course-badge">{selectedAnnouncement.courseName}</span>
                )}
                <h2 id="announcement-modal-title" className="announcement-modal__title">
                  {selectedAnnouncement.title || 'Untitled Announcement'}
                </h2>
                <div className="announcement-modal__meta">
                  {selectedAnnouncement.user_name && <span>By {selectedAnnouncement.user_name}</span>}
                  {selectedAnnouncement.posted_at && (
                    <time dateTime={selectedAnnouncement.posted_at}>
                      {formatAnnouncementDate(selectedAnnouncement.posted_at)}
                    </time>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="announcement-modal__close-btn"
                onClick={() => setSelectedAnnouncement(null)}
                aria-label="Close"
              >
                Close
              </button>
            </div>

            <div className="announcement-modal__body">
              <p className="announcement-modal__text">
                {stripHtml(selectedAnnouncement.message) || 'No content available.'}
              </p>
            </div>

            <div className="announcement-modal__footer">
              {selectedAnnouncement.html_url && (
                <a
                  href={selectedAnnouncement.html_url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="btn btn--primary"
                >
                  Open on Canvas ↗
                </a>
              )}
              <button
                type="button"
                className="btn btn--secondary"
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

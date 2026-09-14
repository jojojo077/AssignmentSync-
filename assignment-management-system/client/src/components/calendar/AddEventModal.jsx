import { useState } from 'react';

export default function AddEventModal({ isOpen, onClose, onSave, courses = [] }) {
  const [name, setName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('23:59');
  const [courseName, setCourseName] = useState('Personal Event');
  const [points, setPoints] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter an event title.');
      return;
    }
    if (!dueDate) {
      setError('Please select a date.');
      return;
    }

    const due_at = new Date(`${dueDate}T${dueTime || '23:59'}:00`).toISOString();

    const selectedCourseObj = courses.find((c) => c.courseName === courseName);
    const courseId = selectedCourseObj ? selectedCourseObj.courseId : 99999;

    onSave({
      name: name.trim(),
      due_at,
      courseId,
      courseName: courseName.trim() || 'Personal Event',
      points_possible: points !== '' ? Number(points) : null,
    });

    // Reset and close
    setName('');
    setDueDate('');
    setDueTime('23:59');
    setCourseName('Personal Event');
    setPoints('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="add-event-title">
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ borderTop: '4px solid #0284c7' }}>
        <div className="modal-card__header">
          <span className="modal-card__course-badge" style={{ backgroundColor: '#e0f2fe', color: '#0369a1', borderColor: '#7dd3fc' }}>
            New Event
          </span>
          <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <h3 id="add-event-title" className="modal-card__title" style={{ marginBottom: '1rem' }}>
          Add Custom Event to Calendar
        </h3>

        {error && (
          <div className="alert alert--error" style={{ marginBottom: '1rem', color: '#ef4444', fontSize: '0.875rem' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="add-event-form" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
            <label htmlFor="event-name-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
              Event Title *
            </label>
            <input
              id="event-name-input"
              type="text"
              className="input"
              placeholder="e.g. Study Group Session, Exam Revision"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="event-date-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Date *
              </label>
              <input
                id="event-date-input"
                type="date"
                className="input"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                required
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="event-time-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Time
              </label>
              <input
                id="event-time-input"
                type="time"
                className="input"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <div className="form-group" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="event-category-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Category / Course
              </label>
              <input
                id="event-category-input"
                type="text"
                className="input"
                placeholder="Personal Event, Study Session..."
                value={courseName}
                onChange={(e) => setCourseName(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div className="form-group" style={{ width: '120px', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <label htmlFor="event-points-input" style={{ fontWeight: 600, fontSize: '0.875rem' }}>
                Points (opt.)
              </label>
              <input
                id="event-points-input"
                type="number"
                min="0"
                className="input"
                placeholder="100"
                value={points}
                onChange={(e) => setPoints(e.target.value)}
                style={{ padding: '0.5rem', borderRadius: '0.375rem', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div className="modal-card__footer" style={{ marginTop: '1rem', paddingTop: '1rem', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
            <button type="button" className="btn btn--secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn--primary">
              Save Event
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

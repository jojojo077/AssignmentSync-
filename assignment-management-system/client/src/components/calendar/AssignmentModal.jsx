import { formatDateTime, getCourseColor } from '../../utils/calendarUtils';

/**
 * Detail popup for a single assignment or calendar event.
 *
 * Props:
 *  - assignment: the item to show; renders nothing when null
 *  - onClose:    dismisses the modal
 *  - onDelete:   optional; when provided (custom events only) a Delete button is shown
 */
export default function AssignmentModal({ assignment, onClose, onDelete }) {
  if (!assignment) return null;

  // Tint the modal with the same colour the course uses in the calendar views.
  const color = getCourseColor(assignment.courseId);

  return (
    <div className="modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{ borderTop: `4px solid ${color.badge}` }}
      >
        <div className="modal-card__header">
          <span
            className="modal-card__course-badge"
            style={{ backgroundColor: color.bg, color: color.text, borderColor: color.border }}
          >
            {assignment.courseName}
          </span>
          <button type="button" className="modal-card__close" onClick={onClose} aria-label="Close modal">
            &times;
          </button>
        </div>

        <h3 className="modal-card__title">{assignment.name}</h3>

        <div className="modal-card__details">
          <div className="modal-card__row">
            <span className="modal-card__label">Due Date:</span>
            <span className="modal-card__value">{formatDateTime(assignment.due_at)}</span>
          </div>

          <div className="modal-card__row">
            <span className="modal-card__label">Points Possible:</span>
            <span className="modal-card__value">
              {assignment.points_possible !== null && assignment.points_possible !== undefined
                ? `${assignment.points_possible} pts`
                : 'Not specified'}
            </span>
          </div>
        </div>

        <div className="modal-card__footer">
          {assignment.html_url && (
            <a
              href={assignment.html_url}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn--primary"
            >
              Open in Canvas &rarr;
            </a>
          )}
          {(assignment.isCustom || onDelete) && (
            <button
              type="button"
              className="btn btn--danger"
              style={{ backgroundColor: '#ef4444', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}
              onClick={() => {
                if (onDelete) onDelete(assignment.id);
                onClose();
              }}
            >
              Delete Event
            </button>
          )}
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

import { formatDateTime, getCourseColor } from '../../utils/calendarUtils';

export default function AssignmentModal({ assignment, onClose }) {
  if (!assignment) return null;

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
          <button type="button" className="btn btn--secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

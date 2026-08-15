import { getWeekDays, isSameDay, isToday, getCourseColor, formatTimeOnly } from '../../utils/calendarUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function WeekView({ currentDate, assignmentsByDate, onSelectAssignment }) {
  const weekDays = getWeekDays(currentDate);

  return (
    <div className="week-grid">
      <div className="week-grid__header">
        {weekDays.map((date, idx) => {
          const isDayToday = isToday(date);
          return (
            <div
              key={idx}
              className={`week-grid__day-header ${isDayToday ? 'week-grid__day-header--today' : ''}`}
            >
              <span className="week-grid__day-name">{DAY_NAMES[date.getDay()]}</span>
              <span className="week-grid__day-number">{date.getDate()}</span>
            </div>
          );
        })}
      </div>

      <div className="week-grid__body">
        {weekDays.map((date, idx) => {
          const isDayToday = isToday(date);
          const dayAssignments = assignmentsByDate.filter((item) => isSameDay(item.due_at, date));

          return (
            <div
              key={idx}
              className={`week-grid__col ${isDayToday ? 'week-grid__col--today' : ''}`}
            >
              {dayAssignments.length === 0 ? (
                <div className="week-grid__empty">No deadlines</div>
              ) : (
                dayAssignments.map((item) => {
                  const color = getCourseColor(item.courseId);
                  return (
                    <div
                      key={`${item.courseId}-${item.id}`}
                      className="week-card"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.border,
                      }}
                      onClick={() => onSelectAssignment(item)}
                      role="button"
                      tabIndex={0}
                    >
                      <div className="week-card__header">
                        <span className="week-card__time">{formatTimeOnly(item.due_at)}</span>
                        {item.points_possible !== null && item.points_possible !== undefined && (
                          <span className="week-card__points">{item.points_possible} pts</span>
                        )}
                      </div>
                      <h4 className="week-card__title" style={{ color: color.text }}>
                        {item.name}
                      </h4>
                      <span className="week-card__course" style={{ color: color.badge }}>
                        {item.courseName}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

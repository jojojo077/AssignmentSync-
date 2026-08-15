import { getMonthGrid, isSameDay, isToday, getCourseColor, formatTimeOnly } from '../../utils/calendarUtils';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function MonthView({ currentDate, assignmentsByDate, onSelectAssignment }) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysGrid = getMonthGrid(year, month);

  return (
    <div className="month-grid">
      <div className="month-grid__header">
        {DAY_NAMES.map((day) => (
          <div key={day} className="month-grid__day-name">
            {day}
          </div>
        ))}
      </div>

      <div className="month-grid__body">
        {daysGrid.map(({ date, isCurrentMonth, dayNumber }, idx) => {
          const isDayToday = isToday(date);
          const dayAssignments = assignmentsByDate.filter((item) => isSameDay(item.due_at, date));

          return (
            <div
              key={idx}
              className={`month-cell ${!isCurrentMonth ? 'month-cell--other-month' : ''} ${
                isDayToday ? 'month-cell--today' : ''
              }`}
            >
              <div className="month-cell__header">
                <span className={`month-cell__number ${isDayToday ? 'month-cell__number--today' : ''}`}>
                  {dayNumber}
                </span>
                {dayAssignments.length > 0 && (
                  <span className="month-cell__count">{dayAssignments.length}</span>
                )}
              </div>

              <div className="month-cell__events">
                {dayAssignments.slice(0, 3).map((item) => {
                  const color = getCourseColor(item.courseId);
                  return (
                    <button
                      key={`${item.courseId}-${item.id}`}
                      type="button"
                      className="assignment-pill"
                      style={{
                        backgroundColor: color.bg,
                        color: color.text,
                        borderColor: color.border,
                      }}
                      onClick={() => onSelectAssignment(item)}
                      title={`${item.name} (${item.courseName}) - ${formatTimeOnly(item.due_at)}`}
                    >
                      <span className="assignment-pill__time">{formatTimeOnly(item.due_at)}</span>
                      <span className="assignment-pill__title">{item.name}</span>
                    </button>
                  );
                })}
                {dayAssignments.length > 3 && (
                  <div className="month-cell__more">+{dayAssignments.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

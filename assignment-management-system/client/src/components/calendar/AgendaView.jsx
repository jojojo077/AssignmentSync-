import { formatDateTime, getCourseColor, isSameDay, isToday } from '../../utils/calendarUtils';

export default function AgendaView({ assignments, onSelectAssignment }) {
  // Sort assignments by due date (null due dates at the end)
  const sorted = [...assignments].sort((a, b) => {
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at) - new Date(b.due_at);
  });

  if (sorted.length === 0) {
    return (
      <div className="agenda-empty">
        <p>No upcoming assignments found for the selected courses.</p>
      </div>
    );
  }

  // Group assignments by date string
  const groups = [];
  sorted.forEach((item) => {
    let groupKey = 'No Due Date';
    if (item.due_at) {
      const dateObj = new Date(item.due_at);
      if (isNaN(dateObj.getTime())) {
        groupKey = 'No Due Date';
      } else if (isToday(dateObj)) {
        groupKey = 'Today';
      } else {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        if (isSameDay(dateObj, tomorrow)) {
          groupKey = 'Tomorrow';
        } else {
          groupKey = dateObj.toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          });
        }
      }
    }

    let existingGroup = groups.find((g) => g.title === groupKey);
    if (!existingGroup) {
      existingGroup = { title: groupKey, items: [] };
      groups.push(existingGroup);
    }
    existingGroup.items.push(item);
  });

  return (
    <div className="agenda-view">
      {groups.map((group) => (
        <div key={group.title} className="agenda-group">
          <h3 className="agenda-group__title">
            <span className="agenda-group__bullet" />
            {group.title}
          </h3>
          <div className="agenda-group__items">
            {group.items.map((item) => {
              const color = getCourseColor(item.courseId);
              return (
                <div
                  key={`${item.courseId}-${item.id}`}
                  className="agenda-item"
                  onClick={() => onSelectAssignment(item)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="agenda-item__color-bar" style={{ backgroundColor: color.badge }} />
                  <div className="agenda-item__main">
                    <div className="agenda-item__header">
                      <span className="agenda-item__course" style={{ color: color.text }}>
                        {item.courseName}
                      </span>
                      <span className="agenda-item__due">{formatDateTime(item.due_at)}</span>
                    </div>
                    <h4 className="agenda-item__title">{item.name}</h4>
                  </div>
                  {item.points_possible !== null && item.points_possible !== undefined && (
                    <div className="agenda-item__points">
                      <span>{item.points_possible}</span>
                      <small>pts</small>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

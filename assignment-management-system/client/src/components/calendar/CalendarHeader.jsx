import { getCourseColor } from '../../utils/calendarUtils';

export default function CalendarHeader({
  currentDate,
  viewMode,
  setViewMode,
  onPrev,
  onNext,
  onToday,
  courses,
  selectedCourseIds,
  onToggleCourse,
}) {
  const monthName = currentDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <div className="calendar-header">
      <div className="calendar-header__left">
        <h2 className="calendar-header__title">{monthName}</h2>
        <div className="calendar-header__nav">
          <button type="button" onClick={onPrev} aria-label="Previous period" className="btn btn--outline">
            &lsaquo;
          </button>
          <button type="button" onClick={onToday} className="btn btn--outline">
            Today
          </button>
          <button type="button" onClick={onNext} aria-label="Next period" className="btn btn--outline">
            &rsaquo;
          </button>
        </div>
      </div>

      <div className="calendar-header__right">
        <div className="view-mode-toggle" role="group" aria-label="Calendar view switcher">
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'month' ? 'view-mode-btn--active' : ''}`}
            onClick={() => setViewMode('month')}
          >
            Month
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'week' ? 'view-mode-btn--active' : ''}`}
            onClick={() => setViewMode('week')}
          >
            Week
          </button>
          <button
            type="button"
            className={`view-mode-btn ${viewMode === 'agenda' ? 'view-mode-btn--active' : ''}`}
            onClick={() => setViewMode('agenda')}
          >
            Agenda
          </button>
        </div>
      </div>

      {courses && courses.length > 0 && (
        <div className="calendar-header__filters">
          <span className="filter-label">Filter Papers:</span>
          {courses.map((course) => {
            const isSelected = selectedCourseIds.includes(course.courseId);
            const color = getCourseColor(course.courseId);
            return (
              <button
                key={course.courseId}
                type="button"
                className={`course-chip ${isSelected ? 'course-chip--active' : 'course-chip--inactive'}`}
                style={{
                  backgroundColor: isSelected ? color.bg : '#f1f5f9',
                  color: isSelected ? color.text : '#64748b',
                  borderColor: isSelected ? color.border : '#cbd5e1',
                }}
                onClick={() => onToggleCourse(course.courseId)}
              >
                <span
                  className="course-chip__dot"
                  style={{ backgroundColor: isSelected ? color.badge : '#94a3b8' }}
                />
                {course.courseName}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

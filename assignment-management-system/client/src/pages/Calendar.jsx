import { useEffect, useState, useMemo } from 'react';
import { canvas } from '../services/api';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import AgendaView from '../components/calendar/AgendaView';
import AssignmentModal from '../components/calendar/AssignmentModal';

export default function Calendar() {
  const [coursesWithAssignments, setCoursesWithAssignments] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month'); // month | week | agenda
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    canvas
      .getUpcomingAssignments()
      .then((res) => {
        if (!cancelled) {
          const data = res.data || [];
          setCoursesWithAssignments(data);
          // Default to all courses selected
          setSelectedCourseIds(data.map((c) => c.courseId));
          setStatus('ready');
        }
      })
      .catch(() => {
        if (!cancelled) setStatus('error');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Course filter toggling
  const handleToggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  // Flatten assignments filtered by selected course IDs
  const filteredAssignments = useMemo(() => {
    const list = [];
    coursesWithAssignments.forEach((course) => {
      if (selectedCourseIds.includes(course.courseId)) {
        (course.assignments || []).forEach((assignment) => {
          list.push({
            ...assignment,
            courseId: course.courseId,
            courseName: course.courseName,
          });
        });
      }
    });
    return list;
  }, [coursesWithAssignments, selectedCourseIds]);

  // Navigation Handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() - 7);
      } else {
        d.setMonth(d.getMonth() - 1);
      }
      return d;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      if (viewMode === 'week') {
        d.setDate(d.getDate() + 7);
      } else {
        d.setMonth(d.getMonth() + 1);
      }
      return d;
    });
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  return (
    <section className="calendar-page">
      <div className="calendar-page__title-area">
        <h1>Assignment Calendar</h1>
        <p>View coursework, deadlines, and manage your academic workload.</p>
      </div>

      {status === 'loading' && <p className="calendar-status">Loading calendar data…</p>}

      {status === 'error' && (
        <div className="calendar-error" role="alert">
          <p>
            Couldn&rsquo;t load calendar assignments. Check that the server is running (
            <code>dotnet run</code> in <code>server/</code>) and that Canvas is configured via{' '}
            <code>dotnet user-secrets</code>.
          </p>
        </div>
      )}

      {status === 'ready' && (
        <>
          <CalendarHeader
            currentDate={currentDate}
            viewMode={viewMode}
            setViewMode={setViewMode}
            onPrev={handlePrev}
            onNext={handleNext}
            onToday={handleToday}
            courses={coursesWithAssignments}
            selectedCourseIds={selectedCourseIds}
            onToggleCourse={handleToggleCourse}
          />

          <div className="calendar-view-container">
            {viewMode === 'month' && (
              <MonthView
                currentDate={currentDate}
                assignmentsByDate={filteredAssignments}
                onSelectAssignment={setSelectedAssignment}
              />
            )}

            {viewMode === 'week' && (
              <WeekView
                currentDate={currentDate}
                assignmentsByDate={filteredAssignments}
                onSelectAssignment={setSelectedAssignment}
              />
            )}

            {viewMode === 'agenda' && (
              <AgendaView
                assignments={filteredAssignments}
                onSelectAssignment={setSelectedAssignment}
              />
            )}
          </div>
        </>
      )}

      <AssignmentModal
        assignment={selectedAssignment}
        onClose={() => setSelectedAssignment(null)}
      />
    </section>
  );
}

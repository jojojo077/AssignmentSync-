import { useEffect, useState, useMemo } from 'react';
import { canvas } from '../services/api';
import CalendarHeader from '../components/calendar/CalendarHeader';
import MonthView from '../components/calendar/MonthView';
import WeekView from '../components/calendar/WeekView';
import AgendaView from '../components/calendar/AgendaView';
import AssignmentModal from '../components/calendar/AssignmentModal';
import AddEventModal from '../components/calendar/AddEventModal';

export default function Calendar() {
  const [coursesWithAssignments, setCoursesWithAssignments] = useState([]);
  const [customEvents, setCustomEvents] = useState([]);
  const [status, setStatus] = useState('idle'); // idle | loading | error | ready
  const [currentDate, setCurrentDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState('month'); // month | week | agenda
  const [selectedCourseIds, setSelectedCourseIds] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');

    // Load local/saved custom events via canvas API
    const loadedCustomEvents = canvas.getCustomEvents ? canvas.getCustomEvents() : [];
    setCustomEvents(loadedCustomEvents);

    canvas
      .getUpcomingAssignments()
      .then((res) => {
        if (!cancelled) {
          const data = res.data || [];
          setCoursesWithAssignments(data);
          // Default to selecting all Canvas courses + custom events (99999)
          const allIds = [...data.map((c) => c.courseId), 99999];
          setSelectedCourseIds(allIds);
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

  // Combine Canvas courses with custom events pseudo-course
  const allCourses = useMemo(() => {
    const list = [...coursesWithAssignments];
    if (customEvents.length > 0) {
      list.push({
        courseId: 99999,
        courseName: 'Personal Events',
        assignments: customEvents,
      });
    }
    return list;
  }, [coursesWithAssignments, customEvents]);

  // Course filter toggling
  const handleToggleCourse = (courseId) => {
    setSelectedCourseIds((prev) =>
      prev.includes(courseId) ? prev.filter((id) => id !== courseId) : [...prev, courseId]
    );
  };

  // Flatten assignments filtered by selected course IDs
  const filteredAssignments = useMemo(() => {
    const list = [];
    allCourses.forEach((course) => {
      if (selectedCourseIds.includes(course.courseId)) {
        (course.assignments || []).forEach((assignment) => {
          list.push({
            ...assignment,
            courseId: assignment.courseId || course.courseId,
            courseName: assignment.courseName || course.courseName,
          });
        });
      }
    });
    return list;
  }, [allCourses, selectedCourseIds]);

  // Add custom event handler
  const handleSaveEvent = (eventData) => {
    if (canvas.addEvent) {
      canvas.addEvent(eventData).then((res) => {
        const created = res.data;
        setCustomEvents((prev) => [...prev, created]);
        if (!selectedCourseIds.includes(99999)) {
          setSelectedCourseIds((prev) => [...prev, 99999]);
        }
      });
    } else {
      const created = { ...eventData, id: `custom_${Date.now()}`, isCustom: true };
      setCustomEvents((prev) => [...prev, created]);
    }
  };

  // Delete custom event handler
  const handleDeleteEvent = (eventId) => {
    if (canvas.deleteCustomEvent) {
      canvas.deleteCustomEvent(eventId);
    }
    setCustomEvents((prev) => prev.filter((e) => e.id !== eventId));
    setSelectedAssignment(null);
  };

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
            courses={allCourses}
            selectedCourseIds={selectedCourseIds}
            onToggleCourse={handleToggleCourse}
            onAddEvent={() => setIsAddModalOpen(true)}
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
        onDelete={selectedAssignment?.isCustom ? handleDeleteEvent : undefined}
      />

      <AddEventModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleSaveEvent}
        courses={coursesWithAssignments}
      />
    </section>
  );
}


import { useEffect, useState, useMemo, useCallback } from 'react';
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

  // Synchronize both Canvas calendar events and assignments
  const fetchCalendarData = useCallback(() => {
    // 1. Fetch remote Canvas calendar events
    if (canvas && typeof canvas.getCalendarEvents === 'function') {
      canvas
        .getCalendarEvents()
        .then((res) => {
          const liveCanvasEvents = (res.data || []).map((e) => ({
            id: e.id,
            name: e.title || e.name,
            due_at: e.start_at || e.due_at,
            courseId: e.courseId || 99999,
            courseName: e.courseName || 'Personal Event',
            html_url: e.html_url,
            isCustom: true,
          }));

          // Prune any stale Canvas events from localStorage
          const retainedLocalDrafts = canvas.pruneStaleCanvasEvents
            ? canvas.pruneStaleCanvasEvents(liveCanvasEvents)
            : [];

          // Merge live Canvas events + purely offline drafts (starting with custom_)
          const offlineDrafts = retainedLocalDrafts.filter((e) => String(e.id).startsWith('custom_'));
          setCustomEvents([...liveCanvasEvents, ...offlineDrafts]);
        })
        .catch(() => {
          const loadedCustomEvents = canvas.getCustomEvents ? canvas.getCustomEvents() : [];
          setCustomEvents(loadedCustomEvents);
        });
    } else {
      const loadedCustomEvents = canvas.getCustomEvents ? canvas.getCustomEvents() : [];
      setCustomEvents(loadedCustomEvents);
    }

    // 2. Fetch assignments
    canvas
      .getUpcomingAssignments()
      .then((res) => {
        const data = res.data || [];
        setCoursesWithAssignments(data);
        setSelectedCourseIds((prev) => {
          if (prev.length === 0) {
            return [...data.map((c) => c.courseId), 99999];
          }
          return prev;
        });
        setStatus('ready');
      })
      .catch(() => {
        setStatus('error');
      });
  }, []);

  useEffect(() => {
    setStatus('loading');
    fetchCalendarData();

    // Auto-sync when returning to the tab (e.g. after modifying/deleting on Canvas LMS)
    const onFocus = () => {
      fetchCalendarData();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      window.removeEventListener('focus', onFocus);
    };
  }, [fetchCalendarData]);

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

  // Delete custom event handler (deletes from Canvas and local state)
  const handleDeleteEvent = async (eventId) => {
    // Optimistically remove from state immediately using string comparison
    setCustomEvents((prev) => prev.filter((e) => String(e.id) !== String(eventId)));
    setSelectedAssignment(null);

    if (canvas.deleteCustomEvent) {
      await canvas.deleteCustomEvent(eventId);
    }
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
            onSync={fetchCalendarData}
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


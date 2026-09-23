import axios from 'axios';

// Single axios instance for the whole app. Base URL comes from Vite env
// (see .env.example) so it's easy to point at a deployed API later.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api',
});

// Attach the auth token (once login is implemented) to every request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ams_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

// Feature-specific calls live here so components never construct URLs
// or call axios directly — keeps the API surface in one place and easy
// to unit test / mock.
export const health = {
  check: () => api.get('/health'),
};

export const canvas = {
    getCourses: () => api.get('/canvas/courses'),
    getUpcomingAssignments: () => api.get('/canvas/assignments'),
    searchAssignmentsByCourseCode: (courseCode) => api.get('/canvas/assignments/search', { params: { courseCode } }),

    getAssignmentProgress: () => api.get('/canvas/assignments/progress'),

    getAnnouncements: () => api.get('/canvas/announcements'),
    getCalendarEvents: () => api.get('/canvas/events'),
    getCustomEvents: () => {
    try {
      const stored = localStorage.getItem('ams_custom_events');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  addEvent: async (eventData) => {
    try {
      // Attempt to persist directly to Canvas LMS API via backend
      const res = await api.post('/canvas/events', eventData);
      const canvasEvent = res.data;
      const formattedEvent = {
        id: canvasEvent.id,
        name: canvasEvent.title || eventData.name,
        due_at: canvasEvent.start_at || eventData.due_at,
        courseId: canvasEvent.courseId || eventData.courseId || 99999,
        courseName: canvasEvent.courseName || eventData.courseName || 'Personal Event',
        points_possible:
          eventData.points_possible !== undefined && eventData.points_possible !== ''
            ? Number(eventData.points_possible)
            : null,
        html_url: canvasEvent.html_url,
        isCustom: true,
      };

      // Also save to localStorage for offline cache
      try {
        const existing = canvas.getCustomEvents().filter((e) => String(e.id) !== String(formattedEvent.id));
        localStorage.setItem('ams_custom_events', JSON.stringify([...existing, formattedEvent]));
      } catch (e) {
        console.error('Failed to cache event to local storage:', e);
      }

      return { data: formattedEvent };
    } catch (err) {
      console.warn('Canvas API event creation failed or offline, using local storage fallback:', err);
      const fallbackEvent = {
        id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        name: eventData.name,
        due_at: eventData.due_at,
        courseId: eventData.courseId || 99999,
        courseName: eventData.courseName || 'Personal Event',
        points_possible:
          eventData.points_possible !== undefined && eventData.points_possible !== ''
            ? Number(eventData.points_possible)
            : null,
        isCustom: true,
      };
      try {
        const existing = canvas.getCustomEvents();
        const updated = [...existing, fallbackEvent];
        localStorage.setItem('ams_custom_events', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save event to local storage fallback:', e);
      }
      return { data: fallbackEvent };
    }
  },
  deleteCustomEvent: async (eventId) => {
    // If ID is a numeric Canvas ID (or string of digits), call backend delete
    const cleanId = typeof eventId === 'string' ? eventId.replace(/^custom_/, '') : eventId;
    if (typeof cleanId === 'number' || /^\d+$/.test(String(cleanId))) {
      try {
        await api.delete(`/canvas/events/${cleanId}`);
      } catch (err) {
        console.warn('Failed to delete event from Canvas API:', err);
      }
    }
    try {
      const existing = canvas.getCustomEvents();
      const updated = existing.filter(
        (e) => String(e.id) !== String(eventId) && String(e.id) !== String(cleanId)
      );
      localStorage.setItem('ams_custom_events', JSON.stringify(updated));
    } catch (e) {
      console.error('Failed to delete event from local storage:', e);
    }
    return { data: eventId };
  },
  pruneStaleCanvasEvents: (activeCanvasEvents = []) => {
    try {
      const activeIds = new Set(activeCanvasEvents.map((e) => String(e.id)));
      const stored = canvas.getCustomEvents();
      // Keep purely offline drafts (starting with custom_) OR events still present in activeCanvasEvents
      const updated = stored.filter((e) => {
        const idStr = String(e.id);
        if (idStr.startsWith('custom_')) return true;
        return activeIds.has(idStr);
      });
      localStorage.setItem('ams_custom_events', JSON.stringify(updated));
      return updated;
    } catch {
      return [];
    }
    },

    
};

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
};

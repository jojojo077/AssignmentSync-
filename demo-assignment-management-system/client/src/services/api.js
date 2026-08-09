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
};

export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (email, password, name) => api.post('/auth/register', { email, password, name }),
};

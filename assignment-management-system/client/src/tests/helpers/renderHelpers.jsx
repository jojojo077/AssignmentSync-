// renderHelpers.jsx
// Shared render helpers so every test mounts real application code with the
// providers it needs in production.

import { vi } from 'vitest';
import { render } from '@testing-library/react';
import { AuthProvider } from '../../context/AuthContext';
import { mockServer } from './mockServer';

/**
 * Renders a page inside the real AuthProvider. Pages such as the Dashboard
 * read the signed-in user and the logout action from AuthContext.
 */
export function renderWithAuth(ui) {
  return render(<AuthProvider>{ui}</AuthProvider>);
}

/**
 * Renders the real <App /> (real router + route guards) at a given URL.
 * The router is created when router.jsx is first imported, so the module
 * graph is reset and re-imported after setting the URL. Returns the mock
 * server and the fresh api module so tests can inspect requests.
 */
export async function renderAppAt(path, { token, user, routes = {} } = {}) {
  if (token) localStorage.setItem('ams_token', token);
  if (user) localStorage.setItem('ams_user', JSON.stringify(user));
  window.history.pushState({}, '', path);
  vi.resetModules();
  const apiModule = await import('../../services/api');
  const server = mockServer(routes, apiModule.default);
  const { default: App } = await import('../../App');
  render(<App />);
  return { server, api: apiModule };
}

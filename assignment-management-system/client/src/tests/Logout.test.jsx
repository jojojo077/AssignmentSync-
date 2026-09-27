// Logout.test.jsx
// Feature: Log out from the Dashboard
// Requirements:
//   FR-01  Secure user authentication and profile management
//          AC: unauthorised users cannot access protected data
//   NFR-04 Authentication and communication must be secure
//          AC: protected resources cannot be accessed without authentication
//
// Every test drives real application code - the Dashboard page, AuthContext,
// the real router/route guards via <App />, and the real axios client.
// Only the network is faked (see helpers/mockServer.js).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { mockServer } from './helpers/mockServer';
import { renderAppAt, renderWithAuth } from './helpers/renderHelpers';

const DASHBOARD_ROUTES = {
  'GET /canvas/assignments': [
    { courseId: 101, courseName: 'Software Quality Assurance', assignments: [{ id: 1, name: 'Assignment 1' }] },
  ],
  'GET /canvas/announcements': [],
  'GET /progress/checklist': [],
  'PUT /progress/checklist': [],
  'GET /canvas/courses': [],
};
const STUDENT = { name: 'Student One', email: 'student@autuni.ac.nz' };

let server;
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
  server = undefined;
  window.history.pushState({}, '', '/');
});

// Signs in via stored session, opens the real app on the Dashboard and
// clicks Log out.
async function openDashboardAndLogOut() {
  const result = await renderAppAt('/', { token: 'valid-token', user: STUDENT, routes: DASHBOARD_ROUTES });
  server = result.server;
  fireEvent.click(await screen.findByRole('button', { name: /log out/i }));
  return result;
}

describe('Logout - Dashboard control', () => {
  // TC-69 | FR-01 | Log out control shown for the signed-in user
  it('TC-69: shows a Log out button and the signed-in user\'s name on the Dashboard', async () => {
    localStorage.setItem('ams_token', 'valid-token');
    localStorage.setItem('ams_user', JSON.stringify(STUDENT));
    server = mockServer(DASHBOARD_ROUTES);

    renderWithAuth(<Dashboard />);

    expect(await screen.findByRole('button', { name: /log out/i })).toBeInTheDocument();
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('Signed in as Student One');
  });
});

describe('Logout - end to end through the app', () => {
  // TC-70 | FR-01 | Logging out returns the user to the login page
  it('TC-70: returns the user to the login page after clicking Log out', async () => {
    await openDashboardAndLogOut();

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /^dashboard$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /log out/i })).not.toBeInTheDocument();
  });

  // TC-71 | NFR-04 | Logging out removes session data from the browser
  it('TC-71: clears the session token, user profile and cached calendar events from the browser', async () => {
    localStorage.setItem(
      'ams_custom_events',
      JSON.stringify([{ id: 'custom_1', name: 'Private Study Session', isCustom: true }])
    );

    await openDashboardAndLogOut();

    await screen.findByRole('heading', { name: /log in/i });
    expect(localStorage.getItem('ams_token')).toBeNull();
    expect(localStorage.getItem('ams_user')).toBeNull();
    expect(localStorage.getItem('ams_custom_events')).toBeNull();
  });

  // TC-72 | FR-01 | Protected pages are blocked after logging out
  it('TC-72: redirects to the login page when a protected page is opened after logging out', async () => {
    await openDashboardAndLogOut();
    await screen.findByRole('heading', { name: /log in/i });
    const assignmentRequestsBefore = server.callsTo('GET /canvas/assignments').length;

    // Use the real navigation bar to try to reach the Calendar
    fireEvent.click(screen.getByRole('link', { name: /calendar/i }));

    await waitFor(() => expect(window.location.pathname).toBe('/login'));
    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /assignment calendar/i })).not.toBeInTheDocument();
    // The Calendar never mounted, so no protected data was requested
    expect(server.callsTo('GET /canvas/assignments')).toHaveLength(assignmentRequestsBefore);
  });

  // TC-73 | NFR-04 | The old token is no longer sent after logging out
  it('TC-73: stops sending the Authorization header on API requests after logging out', async () => {
    const { api } = await openDashboardAndLogOut();
    await screen.findByRole('heading', { name: /log in/i });

    // Requests made while signed in carried the token...
    expect(server.callsTo('GET /canvas/assignments')[0].headers.Authorization).toBe('Bearer valid-token');

    // ...but a request made after logout does not
    await api.canvas.getCourses();
    const [afterLogout] = server.callsTo('GET /canvas/courses');
    expect(afterLogout.headers.Authorization).toBeUndefined();
  });
});

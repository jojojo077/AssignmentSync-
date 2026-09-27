// Auth.test.jsx
// Requirements:
//   FR-01  Secure user authentication and profile management
//          AC: valid users can log in; invalid credentials are rejected;
//              unauthorised users cannot access protected data
//   NFR-04 Authentication and communication must be secure
//          AC: protected resources cannot be accessed without authentication
//
// Every test drives real application code: the Login page, AuthContext, the
// real router (src/router.jsx) via <App />, and the real axios client in
// src/services/api.js. Only the network is faked (see helpers/mockServer.js).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { canvas } from '../services/api';
import { mockServer, status, networkError } from './helpers/mockServer';
import { renderAppAt } from './helpers/renderHelpers';

function renderLogin() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<div>Dashboard Home</div>} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>
  );
}

function fillAndSubmit({ email, password, canvasToken }) {
  fireEvent.change(screen.getByLabelText(/email/i), { target: { value: email } });
  fireEvent.change(screen.getByLabelText(/password/i), { target: { value: password } });
  fireEvent.change(screen.getByLabelText(/canvas access token/i), {
    target: { value: canvasToken },
  });
  fireEvent.click(screen.getByRole('button', { name: /log in/i }));
}

let server;
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
  server = undefined;
  window.history.pushState({}, '', '/');
});

// ---------------------------------------------------------------------------
// Login page
// ---------------------------------------------------------------------------
describe('Auth - Login page', () => {
  // TC-23 | FR-01 | Valid credentials log the user in
  it('TC-23: logs in with valid credentials, stores the token and navigates to the dashboard', async () => {
    server = mockServer({
      'POST /auth/login': {
        token: 'valid-jwt-token',
        user: { name: 'Student', email: 'student@autuni.ac.nz' },
      },
    });

    renderLogin();
    fillAndSubmit({
      email: 'student@autuni.ac.nz',
      password: 'CorrectPassword1',
      canvasToken: 'canvas-token-1',
    });

    await waitFor(() => {
      expect(screen.getByText(/dashboard home/i)).toBeInTheDocument();
    });
    expect(server.callsTo('POST /auth/login')[0].body).toEqual({
      email: 'student@autuni.ac.nz',
      password: 'CorrectPassword1',
      canvasAccessToken: 'canvas-token-1',
    });
    expect(localStorage.getItem('ams_token')).toBe('valid-jwt-token');
  });

  // TC-24 | FR-01 | Invalid credentials are rejected
  it('TC-24: rejects invalid credentials with the server message and stores no token', async () => {
    server = mockServer({
      'POST /auth/login': status(401, { message: 'Invalid email or password' }),
    });

    renderLogin();
    fillAndSubmit({
      email: 'student@autuni.ac.nz',
      password: 'WrongPassword',
      canvasToken: 'canvas-token-1',
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/invalid email or password/i);
    });
    expect(screen.queryByText(/dashboard home/i)).not.toBeInTheDocument();
    expect(localStorage.getItem('ams_token')).toBeNull();
  });

  // TC-01 | FR-01 | Displays error alert when login fails
  it('TC-01: displays a generic error alert when login fails for an unspecified reason', async () => {
    server = mockServer({ 'POST /auth/login': networkError() });

    renderLogin();
    fillAndSubmit({
      email: 'student@autuni.ac.nz',
      password: 'password123',
      canvasToken: 'canvas-token-1',
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/unable to log in/i);
    });
    expect(localStorage.getItem('ams_token')).toBeNull();
  });

  // TC-28 | FR-01 | Profile management - a new account can be created
  it('TC-28: creates a new account and signs the user in', async () => {
    server = mockServer({
      'POST /auth/register': { token: 'new-user-token', user: { name: 'New Student' } },
    });

    renderLogin();
    fireEvent.click(screen.getByRole('tab', { name: /create account/i }));
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'New Student' } });
    fireEvent.change(screen.getByLabelText(/email/i), { target: { value: 'new@autuni.ac.nz' } });
    fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'Password1!' } });
    fireEvent.change(screen.getByLabelText(/canvas access token/i), { target: { value: 'tok' } });
    fireEvent.submit(screen.getByLabelText(/email/i).closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/dashboard home/i)).toBeInTheDocument();
    });
    expect(server.callsTo('POST /auth/register')[0].body).toEqual({
      email: 'new@autuni.ac.nz',
      password: 'Password1!',
      name: 'New Student',
      canvasAccessToken: 'tok',
    });
    expect(JSON.parse(localStorage.getItem('ams_user'))).toEqual({ name: 'New Student' });
  });
});

// ---------------------------------------------------------------------------
// AuthContext
// ---------------------------------------------------------------------------
// Minimal consumer of the real AuthContext - there is no logout control in
// the UI yet, so this is the only way to drive logout().
function AuthConsumer() {
  const { isAuthenticated, token, login, logout } = useAuth();
  return (
    <div>
      <div data-testid="auth-status">{isAuthenticated ? 'logged-in' : 'logged-out'}</div>
      <div data-testid="token">{token || 'no-token'}</div>
      <button onClick={() => login('sample-jwt-token', { name: 'Student' })}>Log In</button>
      <button onClick={logout}>Log Out</button>
    </div>
  );
}

describe('Auth - AuthContext', () => {
  // TC-03 | FR-01 | Updates auth state and persists token on login/logout
  it('TC-03: updates authentication state and localStorage on login and logout', () => {
    render(
      <AuthProvider>
        <AuthConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');

    fireEvent.click(screen.getByRole('button', { name: /log in/i }));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('token')).toHaveTextContent('sample-jwt-token');
    expect(localStorage.getItem('ams_token')).toBe('sample-jwt-token');

    fireEvent.click(screen.getByRole('button', { name: /log out/i }));
    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('ams_token')).toBeNull();
    expect(localStorage.getItem('ams_user')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Route guards in the real router (src/router.jsx)
// ---------------------------------------------------------------------------
describe('Auth - protected routes', () => {
  // TC-25 | FR-01 | Existing session token is restored on load
  it('TC-25: restores a stored session token and shows the dashboard instead of the login page', async () => {
    ({ server } = await renderAppAt('/', {
      token: 'existing-token',
      routes: { 'GET /canvas/assignments': [], 'GET /canvas/announcements': [], 'GET /progress/checklist': [] },
    }));

    expect(await screen.findByRole('heading', { name: /^dashboard$/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /log in/i })).not.toBeInTheDocument();
  });

  // TC-26 | FR-01 | Unauthorised users cannot access protected pages
  it('TC-26: redirects an unauthenticated user from /calendar to the login page', async () => {
    ({ server } = await renderAppAt('/calendar'));

    expect(await screen.findByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /assignment calendar/i })).not.toBeInTheDocument();
    expect(window.location.pathname).toBe('/login');
    // The guarded page never mounted, so no protected data was requested
    expect(server.callsTo('GET /canvas/assignments')).toHaveLength(0);
  });

  // TC-27 | FR-01 | Authenticated users can access protected pages
  it('TC-27: lets an authenticated user open the protected /calendar page', async () => {
    ({ server } = await renderAppAt('/calendar', {
      token: 'valid-token',
      routes: { 'GET /canvas/assignments': [], 'GET /canvas/events': [] },
    }));

    expect(await screen.findByRole('heading', { name: /assignment calendar/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /log in/i })).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// API client authentication header (src/services/api.js interceptor)
// ---------------------------------------------------------------------------
describe('Auth - API client', () => {
  // TC-29 | NFR-04 | Bearer token attached to API requests when logged in
  it('TC-29: attaches the stored token as a Bearer Authorization header', async () => {
    server = mockServer({ 'GET /canvas/courses': [] });
    localStorage.setItem('ams_token', 'abc.def.ghi');

    await canvas.getCourses();

    const [call] = server.callsTo('GET /canvas/courses');
    expect(call.headers.Authorization).toBe('Bearer abc.def.ghi');
  });

  // TC-30 | NFR-04 | No credentials are sent when logged out
  it('TC-30: sends no Authorization header when no user is logged in', async () => {
    server = mockServer({ 'GET /canvas/courses': [] });

    await canvas.getCourses();

    const [call] = server.callsTo('GET /canvas/courses');
    expect(call.headers.Authorization).toBeUndefined();
  });
});

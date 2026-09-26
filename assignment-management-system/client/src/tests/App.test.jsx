// App.test.jsx
// Smoke test for the full application shell (App -> AuthProvider -> router).
// Requirement: FR-01 Secure user authentication and profile management

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';
import { mockServer } from './helpers/mockServer';

describe('App', () => {
  let server;

  beforeEach(() => {
    localStorage.clear();
    server = mockServer();
  });

  afterEach(() => {
    server.restore();
  });

  // TC-02 | FR-01 | Renders the login page first
  it('TC-02: renders the login page first', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    // No API traffic is needed just to show the login screen
    expect(server.calls).toHaveLength(0);
  });
});

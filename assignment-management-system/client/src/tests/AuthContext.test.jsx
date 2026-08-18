import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';

function TestConsumer() {
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

describe('AuthContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Test Case: Manages authentication state and persists token to localStorage
  it('updates authentication state and localStorage on login and logout', () => {
    render(
      <AuthProvider>
        <TestConsumer />
      </AuthProvider>
    );

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');

    // Perform Login
    fireEvent.click(screen.getByRole('button', { name: /log in/i }));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-in');
    expect(screen.getByTestId('token')).toHaveTextContent('sample-jwt-token');
    expect(localStorage.getItem('ams_token')).toBe('sample-jwt-token');

    // Perform Logout
    fireEvent.click(screen.getByRole('button', { name: /log out/i }));

    expect(screen.getByTestId('auth-status')).toHaveTextContent('logged-out');
    expect(screen.getByTestId('token')).toHaveTextContent('no-token');
    expect(localStorage.getItem('ams_token')).toBeNull();
  });
});

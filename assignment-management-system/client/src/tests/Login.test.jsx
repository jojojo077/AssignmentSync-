import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Login from '../pages/Login';
import { AuthProvider } from '../context/AuthContext';
import { auth } from '../services/api';

vi.mock('../services/api', () => ({
  auth: {
    login: vi.fn(),
  },
}));

describe('Login Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case: Login failure displays alert message
  it('displays error alert when login fails', async () => {
    auth.login.mockRejectedValue(new Error('501 Not Implemented'));

    render(
      <MemoryRouter>
        <AuthProvider>
          <Login />
        </AuthProvider>
      </MemoryRouter>
    );

    const emailInput = screen.getByLabelText(/email/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitBtn = screen.getByRole('button', { name: /log in/i });

    fireEvent.change(emailInput, { target: { value: 'student@autuni.ac.nz' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitBtn);

    expect(auth.login).toHaveBeenCalledWith('student@autuni.ac.nz', 'password123');

    await waitFor(() => {
      const alert = screen.getByRole('alert');
      expect(alert).toBeInTheDocument();
      expect(alert).toHaveTextContent(/backend auth is still a placeholder/i);
    });
  });
});

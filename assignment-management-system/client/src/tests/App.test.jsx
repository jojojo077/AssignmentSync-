import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Login renders first, so this smoke test does not need a running server.
vi.mock('../services/api', () => ({
  canvas: { getUpcomingAssignments: vi.fn().mockResolvedValue({ data: [] }) },
  progress: { getChecklist: vi.fn().mockResolvedValue({ data: [] }), setChecklist: vi.fn() },
  auth: { login: vi.fn(), register: vi.fn() },
  health: { check: vi.fn() },
}));

describe('App', () => {
  it('renders the login page first', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /log in/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });
});

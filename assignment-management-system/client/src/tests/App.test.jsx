import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from '../App';

// Dashboard fetches on mount — mock it so this smoke test doesn't make a
// real network call (and doesn't depend on the server being up).
vi.mock('../services/api', () => ({
  canvas: { getUpcomingAssignments: vi.fn().mockResolvedValue({ data: [] }) },
  auth: { login: vi.fn(), register: vi.fn() },
  health: { check: vi.fn() },
}));

describe('App', () => {
  it('renders the dashboard by default with nav links', () => {
    render(<App />);

    expect(screen.getByRole('heading', { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /calendar/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /assignments/i })).toBeInTheDocument();
  });
});

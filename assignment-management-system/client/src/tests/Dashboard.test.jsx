import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { canvas } from '../services/api';

vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
  },
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Test Case: Successful fetch displays course list and assignment count
  it('renders list of courses and their assignment count on success', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [{ id: 1, name: 'Assignment 1' }, { id: 2, name: 'Assignment 2' }],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    expect(screen.getByText(/loading assignments…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Software Quality Assurance/i)).toBeInTheDocument();
      expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    });
  });

  // Test Case : API error displays error alert
  it('renders error alert when fetching assignments fails', async () => {
    canvas.getUpcomingAssignments.mockRejectedValue(new Error('Network error'));

    render(<Dashboard />);

    await waitFor(() => {
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveTextContent(/couldn[’']t load assignments/i);
    });
  });
});

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../pages/Calendar';

const mockCoursesData = [
  {
    courseId: 23616,
    courseName: 'Software Quality Assurance 2026 S2',
    assignments: [
      {
        id: 195229,
        name: 'Mid-Project Report',
        due_at: '2026-08-23T11:59:59Z',
        points_possible: 100,
        html_url: 'https://aut.instructure.com/courses/23616/assignments/195229',
      },
    ],
  },
];

vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
  },
}));

import { canvas } from '../services/api';

describe('Calendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially and then calendar contents', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    expect(screen.getByText(/loading calendar data/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /assignment calendar/i })).toBeInTheDocument();
      expect(screen.getByText(/Software Quality Assurance 2026 S2/i)).toBeInTheDocument();
    });
  });

  it('switches between Month, Week, and Agenda views', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Month$/i })).toBeInTheDocument();
    });

    const weekBtn = screen.getByRole('button', { name: /^Week$/i });
    fireEvent.click(weekBtn);

    expect(weekBtn).toHaveClass('view-mode-btn--active');

    const agendaBtn = screen.getByRole('button', { name: /^Agenda$/i });
    fireEvent.click(agendaBtn);

    expect(agendaBtn).toHaveClass('view-mode-btn--active');
    expect(screen.getByText(/Mid-Project Report/i)).toBeInTheDocument();
  });

  it('opens assignment detail modal when clicked', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByText(/Mid-Project Report/i)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText(/Mid-Project Report/i));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/100 pts/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /open in canvas/i })).toHaveAttribute(
      'href',
      'https://aut.instructure.com/courses/23616/assignments/195229'
    );
  });
});

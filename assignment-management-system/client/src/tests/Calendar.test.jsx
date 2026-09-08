//Calendar Test Case
//Interactive calendar with daily, weekly and monthly views
//Objective: Consolidate academic scheduling into one application
//Acceptance Criteria: Users can switch between daily, weekly and monthly views and see relevant events. Users can add custom events, which are saved and displayed.

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
    getCustomEvents: vi.fn(() => []),
    addEvent: vi.fn((eventData) =>
      Promise.resolve({
        data: {
          id: 'custom_test_123',
          ...eventData,
          isCustom: true,
        },
      })
    ),
    deleteCustomEvent: vi.fn(() => Promise.resolve({ data: 'custom_test_123' })),
  },
}));

import { canvas } from '../services/api';

describe('Calendar Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvas.getCustomEvents.mockReturnValue([]);
  });

  //UT1: Load calendar and input contents
  it('renders loading state initially and then calendar contents', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    expect(screen.getByText(/loading calendar data/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /assignment calendar/i })).toBeInTheDocument();
      expect(screen.getByText(/Software Quality Assurance 2026 S2/i)).toBeInTheDocument();
    });
  });

  //UT2: Test switching between calendar views
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

  //UT3: Test opening assignment modal
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

  //UT4: Acceptance Criteria - User input is shown on the calendar
  it('shows user input custom event on the calendar after form submission', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Add Event/i })).toBeInTheDocument();
    });

    // Open add event modal
    fireEvent.click(screen.getByRole('button', { name: /\+ Add Event/i }));

    expect(screen.getByLabelText(/Event Title \*/i)).toBeInTheDocument();

    // Fill in user inputs
    fireEvent.change(screen.getByLabelText(/Event Title \*/i), {
      target: { value: 'Custom Study Session' },
    });
    fireEvent.change(screen.getByLabelText(/Date \*/i), {
      target: { value: '2026-08-25' },
    });

    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /Save Event/i }));

    // Verify user input is displayed on calendar
    await waitFor(() => {
      expect(screen.getByText(/Custom Study Session/i)).toBeInTheDocument();
    });
  });

  //UT5: Acceptance Criteria - Input is saved to canvas service
  it('saves the custom event input via canvas.addEvent service', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockCoursesData });

    render(<Calendar />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ Add Event/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /\+ Add Event/i }));

    fireEvent.change(screen.getByLabelText(/Event Title \*/i), {
      target: { value: 'Exam Revision' },
    });
    fireEvent.change(screen.getByLabelText(/Date \*/i), {
      target: { value: '2026-08-28' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Save Event/i }));

    await waitFor(() => {
      expect(canvas.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Exam Revision',
        })
      );
    });
  });
});


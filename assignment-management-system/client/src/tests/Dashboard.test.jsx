//Dashboard Test Case
//Dashboard displaying upcoming assessments, announcements, workload summaries and progress
//Objective: Provide students with a single view of academic workload
//Acceptance Criteria: Students can view upcoming deadlines, announcements, workload and progress from one dashboard

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { canvas } from '../services/api';

vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
    getAnnouncements: vi.fn(),
  },
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  //UT1: Successful fetch displays course list and assignment count
  it('renders list of courses and their assignment count on success', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [{ id: 1, name: 'Assignment 1' }, { id: 2, name: 'Assignment 2' }],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    expect(screen.getByText(/loading assignments…/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/Software Quality Assurance/i)).toBeInTheDocument();
      expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    });
  });

  //UT2: API error displays error alert
  it('renders error alert when fetching assignments fails', async () => {
    canvas.getUpcomingAssignments.mockRejectedValue(new Error('Network error'));
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      const alertElement = screen.getByRole('alert');
      expect(alertElement).toBeInTheDocument();
      expect(alertElement).toHaveTextContent(/couldn[’']t load assignments/i);
    });
  });

  //UT3: Successful fetch displays recent announcements column and items
  it('renders recent announcements column with announcements on success', async () => {
    const mockAssignments = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [{ id: 1, name: 'Assignment 1' }],
      },
    ];
    const mockAnnouncements = [
      {
        id: 501,
        title: 'Project Submission Deadline Reminder',
        message: '<p>Please make sure all tests pass before submitting your final report.</p>',
        posted_at: '2026-09-15T10:00:00Z',
        courseName: 'Software Quality Assurance',
        user_name: 'Dr. Jane Smith',
        html_url: 'https://canvas.example.com/courses/101/announcements/501',
      },
    ];

    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockAssignments });
    canvas.getAnnouncements.mockResolvedValue({ data: mockAnnouncements });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /recent announcements/i })).toBeInTheDocument();
      expect(screen.getByText('Project Submission Deadline Reminder')).toBeInTheDocument();
      expect(screen.getByText(/Posted by Dr. Jane Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Please make sure all tests pass/i)).toBeInTheDocument();
    });
  });

  //UT4: Empty announcement state when no announcements are returned
  it('displays empty announcement message when no announcements are returned', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: [] });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no recent announcements/i)).toBeInTheDocument();
    });
  });

  //UT5: Handles announcement fetch failure gracefully without breaking course display
  it('handles announcement fetch failure gracefully while still rendering assignments', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [{ id: 1, name: 'Assignment 1' }],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockRejectedValue(new Error('Announcements network error'));

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/Software Quality Assurance/i)).toBeInTheDocument();
      expect(screen.getByText(/could not load announcements at this time/i)).toBeInTheDocument();
    });
  });

  //UT6: Clicking announcement opens full detail modal and closes on button click
  it('opens and closes announcement detail modal upon interaction', async () => {
    const mockAssignments = [{ courseId: 101, courseName: 'Software Quality Assurance', assignments: [] }];
    const mockAnnouncements = [
      {
        id: 501,
        title: 'Project Submission Deadline Reminder',
        message: '<p>Detailed announcement body text.</p>',
        posted_at: '2026-09-15T10:00:00Z',
        courseName: 'Software Quality Assurance',
        user_name: 'Dr. Jane Smith',
      },
    ];

    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockAssignments });
    canvas.getAnnouncements.mockResolvedValue({ data: mockAnnouncements });

    const { fireEvent } = await import('@testing-library/react');
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Project Submission Deadline Reminder')).toBeInTheDocument();
    });

    // Click to open modal
    fireEvent.click(screen.getByRole('button', { name: /read full announcement/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Detailed announcement body text/i)).toBeInTheDocument();

    // Click Close
    fireEvent.click(within(dialog).getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});


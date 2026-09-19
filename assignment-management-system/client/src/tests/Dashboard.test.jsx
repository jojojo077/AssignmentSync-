//Dashboard Test Case
//Dashboard displaying upcoming assessments, announcements, workload summaries and progress
//Objective: Provide students with a single view of academic workload
//Acceptance Criteria: Students can view upcoming deadlines, announcements, workload and progress from one dashboard

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { canvas } from '../services/api';

vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
    getAnnouncements: vi.fn(),
    getCompletedAssignments: vi.fn(() => []),
    setCompletedAssignments: vi.fn(),
    toggleAssignmentCompleted: vi.fn(),
  },
}));

describe('Dashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvas.getCompletedAssignments.mockReturnValue([]);
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
      // getAllByText because course name appears in both workload and progress columns
      const courseNames = screen.getAllByText(/Software Quality Assurance/i);
      expect(courseNames.length).toBeGreaterThan(0);
      expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    });
  });

  //UT2: API error displays error alert
  it('renders error alert when fetching assignments fails', async () => {
    canvas.getUpcomingAssignments.mockRejectedValue(new Error('Network error'));
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      const alertElements = screen.getAllByRole('alert');
      expect(alertElements.length).toBeGreaterThan(0);
      const assignmentsAlert = alertElements.find(el => el.textContent.includes("load assignments"));
      expect(assignmentsAlert).toBeTruthy();
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
      const courseNames = screen.getAllByText(/Software Quality Assurance/i);
      expect(courseNames.length).toBeGreaterThan(0);
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

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Project Submission Deadline Reminder')).toBeInTheDocument();
    });

    // Click to open modal
    fireEvent.click(screen.getByRole('button', { name: /read full announcement/i }));

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText(/Detailed announcement body text/i)).toBeInTheDocument();

    // Click Close — use the footer Close button (btn--secondary), not the modal header one
    const closeButtons = screen.getAllByRole('button', { name: /^Close$/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  //UT7: Semester progress column is rendered with correct heading
  it('renders the semester progress column with heading and progress bar', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'Assignment 1', due_at: '2026-09-20T23:59:00Z' },
          { id: 2, name: 'Assignment 2', due_at: '2026-10-01T23:59:00Z' },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /semester progress/i })).toBeInTheDocument();
      // Progress bar should be present with role="progressbar"
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeInTheDocument();
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
      expect(progressBar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  //UT8: Toggling assignment updates progress count
  it('updates completed count when an assignment checkbox is toggled', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'Assignment 1', due_at: '2026-09-20T23:59:00Z' },
          { id: 2, name: 'Assignment 2', due_at: '2026-10-01T23:59:00Z' },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      // Initially 0% complete
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '0');
    });

    // Check off Assignment 1
    const checkbox = screen.getByRole('checkbox', { name: /mark assignment 1 as complete/i });
    fireEvent.click(checkbox);

    await waitFor(() => {
      // Progress should now be 50% (1 of 2)
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
    });
  });

  //UT9: Per-course breakdown shows correct course names
  it('renders per-course progress breakdown with correct course names', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [{ id: 1, name: 'Assignment 1' }],
      },
      {
        courseId: 202,
        courseName: 'Data Structures',
        assignments: [{ id: 3, name: 'Lab 1' }, { id: 4, name: 'Lab 2' }],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      // Both courses should appear in the per-course breakdown section (getAllByText as they appear in multiple places)
      const progressSection = screen.getByRole('region', { name: /semester assignment progress/i });
      const sqaMatches = within(progressSection).getAllByText(/Software Quality Assurance/i);
      expect(sqaMatches.length).toBeGreaterThan(0);
      const dsMatches = within(progressSection).getAllByText(/Data Structures/i);
      expect(dsMatches.length).toBeGreaterThan(0);
    });
  });

  //UT10: Empty progress state when there are no assignments
  it('shows an empty state in progress column when no assignments exist', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: [] });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/no assignments to track/i)).toBeInTheDocument();
    });
  });
  
  //UT11: Announcement previews strip HTML while retaining readable content
  it('renders a clean recent announcement preview from HTML content', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: [] });
    canvas.getAnnouncements.mockResolvedValue({
      data: [
        {
          id: 502,
          title: 'Library Hours Update',
          message: '<p>Library closes at 8pm&nbsp;&amp;&nbsp;reopens at 9am.</p>',
          courseName: 'Software Quality Assurance',
        },
      ],
    });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('Library closes at 8pm & reopens at 9am.')).toBeInTheDocument();
    });
    expect(screen.queryByText(/<p>|&nbsp;|&amp;/)).not.toBeInTheDocument();
  });

  //UT12: Canvas submission flags seed semester progress
  it('seeds semester progress from completed assignments returned by Canvas', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'Assignment 1', has_submitted_submissions: true },
          { id: 2, name: 'Assignment 2' },
        ],
      },
    ];
    canvas.getCompletedAssignments.mockReturnValue([]);
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('1 of 2 assignments completed this semester')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: /mark assignment 1 as incomplete/i })).toBeChecked();
    expect(canvas.setCompletedAssignments).toHaveBeenCalledWith(['1']);
  });
});

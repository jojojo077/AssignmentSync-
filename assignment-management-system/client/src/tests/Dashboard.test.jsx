// Dashboard.test.jsx
// Requirements:
//   FR-03  Dashboard displaying upcoming assessments, announcements,
//          workload summaries and progress
//          AC: students can view deadlines, announcements, workload and
//              progress from one dashboard
//   FR-08  Allow students to track assignment completion percentages
//          AC: users can update completion and the dashboard reflects it
//   NFR-03 Canvas requests handled with appropriate error handling
//
// Renders the real Dashboard page with the real canvas/progress services.
// Only HTTP is faked (see helpers/mockServer.js).

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within, fireEvent } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { mockServer, networkError } from './helpers/mockServer';

let server;
function startServer({ assignments = [], announcements = [], checklist = [] } = {}) {
  server = mockServer({
    'GET /canvas/assignments': assignments,
    'GET /canvas/announcements': announcements,
    'GET /progress/checklist': checklist,
    'PUT /progress/checklist': ({ body }) => body.assignmentIds,
  });
  return server;
}
const lastSavedChecklist = () => server.callsTo('PUT /progress/checklist').at(-1)?.body.assignmentIds;

const SQA_TWO = [
  {
    courseId: 101,
    courseName: 'Software Quality Assurance',
    assignments: [
      { id: 1, name: 'Assignment 1', due_at: '2026-09-20T23:59:00Z' },
      { id: 2, name: 'Assignment 2', due_at: '2026-10-01T23:59:00Z' },
    ],
  },
];

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
});

// ---------------------------------------------------------------------------
// FR-03 Dashboard content
// ---------------------------------------------------------------------------
describe('Dashboard - content (FR-03)', () => {
  // TC-05 | FR-03 | Renders list of courses and assignment count
  it('TC-05: shows a loading state then the course list with assignment counts', async () => {
    startServer({ assignments: SQA_TWO });
    render(<Dashboard />);

    expect(screen.getByText(/loading assignments.../i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getAllByText(/Software Quality Assurance/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    });
  });

  // TC-47 | FR-03 | Active course count shown in header stats
  it('TC-47: shows the number of active courses in the header stats strip', async () => {
    startServer({
      assignments: [
        { courseId: 101, courseName: 'SQA', assignments: [{ id: 1, name: 'T1' }] },
        { courseId: 202, courseName: 'Data Structures', assignments: [{ id: 2, name: 'T2' }] },
        { courseId: 303, courseName: 'Algorithms', assignments: [{ id: 3, name: 'T3' }] },
      ],
    });
    render(<Dashboard />);

    await waitFor(() => {
      const badge = screen.getByText('Active Courses').closest('.dashboard-stat-badge');
      expect(within(badge).getByText('3')).toBeInTheDocument();
    });
  });

  // TC-06 | FR-03 | Renders recent announcements
  it('TC-06: renders the recent announcements column with announcement details', async () => {
    startServer({
      assignments: [{ courseId: 101, courseName: 'Software Quality Assurance', assignments: [{ id: 1, name: 'A1' }] }],
      announcements: [
        {
          id: 501,
          title: 'Project Submission Deadline Reminder',
          message: '<p>Please make sure all tests pass before submitting your final report.</p>',
          posted_at: '2026-09-15T10:00:00Z',
          courseName: 'Software Quality Assurance',
          user_name: 'Dr. Jane Smith',
        },
      ],
    });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /recent announcements/i })).toBeInTheDocument();
      expect(screen.getByText('Project Submission Deadline Reminder')).toBeInTheDocument();
      expect(screen.getByText(/Posted by Dr. Jane Smith/i)).toBeInTheDocument();
      expect(screen.getByText(/Please make sure all tests pass/i)).toBeInTheDocument();
    });
  });

  // TC-07 | FR-03 | Empty announcement message
  it('TC-07: displays an empty message when no announcements are returned', async () => {
    startServer();
    render(<Dashboard />);

    expect(await screen.findByText(/no recent announcements/i)).toBeInTheDocument();
  });

  // TC-08 | FR-03 | Announcement detail modal opens and closes
  it('TC-08: opens and closes the announcement detail modal', async () => {
    startServer({
      announcements: [
        {
          id: 501,
          title: 'Project Submission Deadline Reminder',
          message: '<p>Detailed announcement body text.</p>',
          posted_at: '2026-09-15T10:00:00Z',
          courseName: 'Software Quality Assurance',
          user_name: 'Dr. Jane Smith',
        },
      ],
    });
    render(<Dashboard />);

    await screen.findByText('Project Submission Deadline Reminder');
    fireEvent.click(screen.getByRole('button', { name: /read full announcement/i }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/Detailed announcement body text/i)).toBeInTheDocument();

    const closeButtons = within(dialog).getAllByRole('button', { name: /^Close$/i });
    fireEvent.click(closeButtons[closeButtons.length - 1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  // TC-09 | FR-03 | Announcement preview has HTML stripped
  it('TC-09: renders a clean announcement preview with HTML tags and entities removed', async () => {
    startServer({
      announcements: [
        {
          id: 502,
          title: 'Library Hours Update',
          message: '<p>Library closes at 8pm&nbsp;&amp;&nbsp;reopens at 9am.</p>',
          courseName: 'Software Quality Assurance',
        },
      ],
    });
    render(<Dashboard />);

    expect(await screen.findByText('Library closes at 8pm & reopens at 9am.')).toBeInTheDocument();
    expect(screen.queryByText(/<p>|&nbsp;|&amp;/)).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FR-08 Progress tracking
// ---------------------------------------------------------------------------
describe('Dashboard - progress tracking (FR-08)', () => {
  // TC-15 | FR-08 | Semester progress column and progress bar
  it('TC-15: renders the semester progress column with heading and a 0% progress bar', async () => {
    startServer({ assignments: SQA_TWO });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /semester progress/i })).toBeInTheDocument();
      const bar = screen.getByRole('progressbar');
      expect(bar).toHaveAttribute('aria-valuenow', '0');
      expect(bar).toHaveAttribute('aria-valuemax', '100');
    });
  });

  // TC-16 | FR-08 | Toggling an assignment updates and saves progress
  it('TC-16: updates the completed percentage and saves the checklist when an assignment is ticked', async () => {
    startServer({ assignments: SQA_TWO });
    render(<Dashboard />);

    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0'));

    fireEvent.click(screen.getByRole('checkbox', { name: /mark assignment 1 as complete/i }));

    await waitFor(() => expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50'));
    expect(lastSavedChecklist()).toEqual(['1']);
  });

  // TC-45 | FR-08 | Saved checklist is restored from the server
  it("TC-45: restores the user's saved checklist from the server on load", async () => {
    startServer({ assignments: SQA_TWO, checklist: ['2'] });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByRole('checkbox', { name: /mark assignment 2 as incomplete/i })).toBeChecked();
    });
    expect(screen.getByRole('checkbox', { name: /mark assignment 1 as complete/i })).not.toBeChecked();
  });

  // TC-17 | FR-08 | Per-course progress breakdown
  it('TC-17: renders a per-course progress breakdown with course names and completion fractions', async () => {
    startServer({
      assignments: [
        { courseId: 101, courseName: 'Software Quality Assurance', assignments: [{ id: 1, name: 'Assignment 1' }] },
        { courseId: 202, courseName: 'Data Structures', assignments: [{ id: 3, name: 'Lab 1' }, { id: 4, name: 'Lab 2' }] },
      ],
    });
    render(<Dashboard />);

    await waitFor(() => {
      const section = screen.getByRole('region', { name: /semester assignment progress/i });
      expect(within(section).getAllByText(/Software Quality Assurance/i).length).toBeGreaterThan(0);
      expect(within(section).getAllByText(/Data Structures/i).length).toBeGreaterThan(0);
      expect(within(section).getByText('0/1')).toBeInTheDocument();
      expect(within(section).getByText('0/2')).toBeInTheDocument();
    });
  });

  // TC-18 | FR-08 | Empty progress state
  it('TC-18: shows an empty state in the progress column when there are no assignments', async () => {
    startServer();
    render(<Dashboard />);

    expect(await screen.findByText(/no assignments to track/i)).toBeInTheDocument();
  });

  // TC-19 | FR-08 | Seeds and saves semester progress
  it('TC-19: seeds progress from Canvas submissions and saves it for the authenticated user', async () => {
    startServer({
      assignments: [
        {
          courseId: 101,
          courseName: 'Software Quality Assurance',
          assignments: [
            { id: 1, name: 'Assignment 1', has_submitted_submissions: true },
            { id: 2, name: 'Assignment 2' },
          ],
        },
      ],
    });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '50');
      expect(screen.getByText('1 of 2 assignments completed this semester')).toBeInTheDocument();
    });
    expect(screen.getByRole('checkbox', { name: /mark assignment 1 as incomplete/i })).toBeChecked();
    expect(lastSavedChecklist()).toEqual(['1']);
  });

  // TC-46 | FR-08 | 100% completion message
  it('TC-46: shows the "all caught up" message when every assignment is complete', async () => {
    startServer({
      assignments: [
        {
          courseId: 101,
          courseName: 'Software Quality Assurance',
          assignments: [{ id: 1, name: 'Submitted Work', has_submitted_submissions: true }],
        },
      ],
    });
    render(<Dashboard />);

    expect(await screen.findByText(/all caught up/i)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100');
  });
});

// ---------------------------------------------------------------------------
// NFR-03 Error handling
// ---------------------------------------------------------------------------
describe('Dashboard - error handling (NFR-03)', () => {
  // TC-21 | NFR-03 | Error alert when fetching assignments fails
  it('TC-21: renders an error alert when fetching assignments fails', async () => {
    server = mockServer({
      'GET /canvas/assignments': networkError(),
      'GET /canvas/announcements': [],
      'GET /progress/checklist': [],
    });
    render(<Dashboard />);

    await waitFor(() => {
      const alert = screen.getAllByRole('alert').find((el) => el.textContent.includes('load assignments'));
      expect(alert).toBeTruthy();
    });
  });

  // TC-22 | NFR-03 | Announcement failure handled while assignments still render
  it('TC-22: handles an announcement fetch failure while still rendering assignments', async () => {
    server = mockServer({
      'GET /canvas/assignments': [
        { courseId: 101, courseName: 'Software Quality Assurance', assignments: [{ id: 1, name: 'Assignment 1' }] },
      ],
      'GET /canvas/announcements': networkError('Announcements network error'),
      'GET /progress/checklist': [],
      'PUT /progress/checklist': [],
    });
    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getAllByText(/Software Quality Assurance/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/could not load announcements at this time/i)).toBeInTheDocument();
    });
  });
});

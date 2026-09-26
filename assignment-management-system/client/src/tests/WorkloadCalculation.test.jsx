// WorkloadCalculation.test.jsx
// Requirements:
//   FR-06  Automatically calculate workload based on due dates, assessment
//          weightings and estimated completion time
//   NFR-03 Canvas requests handled with appropriate error handling
//
// Covers the workload summary on the real Dashboard page and the real
// Workload Summary page (src/pages/Assignments.jsx). Only HTTP is faked.
//
// Coverage note: the client displays the workload the server calculates
// (counts, due dates, completed / overdue / uncompleted split). Weighting and
// estimated completion time are not surfaced in the UI, so that part of the
// FR-06 acceptance criteria must be covered by server-side tests.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import Assignments from '../pages/Assignments';
import { mockServer, networkError } from './helpers/mockServer';

let server;
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
});

function startDashboard(assignments) {
  server = mockServer({
    'GET /canvas/assignments': assignments,
    'GET /canvas/announcements': [],
    'GET /progress/checklist': [],
    'PUT /progress/checklist': [],
  });
}

describe('Workload - Dashboard summary (FR-06)', () => {
  // TC-48 | FR-06 | Total assignment count badge
  it('TC-48: shows the total number of assignments across all courses as the workload count', async () => {
    startDashboard([
      { courseId: 101, courseName: 'SQA', assignments: [{ id: 1, name: 'A1' }, { id: 2, name: 'A2' }] },
      { courseId: 202, courseName: 'Data Structures', assignments: [{ id: 3, name: 'Lab 1' }] },
    ]);
    render(<Dashboard />);

    await waitFor(() => {
      const badge = screen.getByText('Assignments').closest('.dashboard-stat-badge');
      expect(within(badge).getByText('3')).toBeInTheDocument();
    });
  });

  // TC-49 | FR-06 | Due dates shown alongside assignment names
  it('TC-49: shows each assignment due date alongside its name in the workload list', async () => {
    startDashboard([
      {
        courseId: 202,
        courseName: 'Data Structures',
        assignments: [{ id: 3, name: 'Binary Tree Lab', due_at: '2026-10-10T23:59:00Z', points_possible: 30 }],
      },
    ]);
    render(<Dashboard />);

    await waitFor(() => {
      const item = screen.getAllByText('Binary Tree Lab')[0].closest('.dashboard-assignment-subitem');
      expect(item).not.toBeNull();
      expect(item.textContent).toMatch(/Oct/);
      expect(item.textContent).toMatch(/10/);
    });
  });
});

describe('Workload - Workload Summary page (FR-06)', () => {
  const progressData = [
    {
      courseId: 101,
      courseName: 'Software Quality Assurance',
      totalCount: 4,
      completedCount: 1,
      overdueCount: 1,
      uncompletedCount: 2,
      assignments: [
        { status: 'Completed', assignment: { id: 1, name: 'Test Plan' } },
        { status: 'Overdue', assignment: { id: 2, name: 'Risk Register' } },
        { status: 'Uncompleted', assignment: { id: 3, name: 'Mid-Project Report' } },
        { status: 'Uncompleted', assignment: { id: 4, name: 'Final Report' } },
      ],
    },
    {
      courseId: 202,
      courseName: 'Data Structures',
      totalCount: 0,
      completedCount: 0,
      overdueCount: 0,
      uncompletedCount: 0,
      assignments: [],
    },
  ];

  // TC-50 | FR-06 | Per-course completion percentage calculated
  it('TC-50: calculates and shows the completion percentage for each course', async () => {
    server = mockServer({ 'GET /canvas/assignments/progress': progressData });
    render(<Assignments />);

    expect(await screen.findByText(/- 25% complete/)).toBeInTheDocument();
    expect(screen.getByText('Software Quality Assurance').closest('summary')).toHaveTextContent('25% complete');
  });

  // TC-51 | FR-06 | Assignments grouped by workload status
  it('TC-51: groups a course\'s assignments into Overdue, Uncompleted and Completed with counts', async () => {
    server = mockServer({ 'GET /canvas/assignments/progress': progressData });
    render(<Assignments />);

    const details = (await screen.findByText('Software Quality Assurance')).closest('details');
    expect(within(details).getByRole('heading', { name: 'Overdue (1)' })).toBeInTheDocument();
    expect(within(details).getByRole('heading', { name: 'Uncompleted (2)' })).toBeInTheDocument();
    expect(within(details).getByRole('heading', { name: 'Completed (1)' })).toBeInTheDocument();
    expect(within(details).getByText('Risk Register')).toBeInTheDocument();
    expect(within(details).getByText('Final Report')).toBeInTheDocument();
  });

  // TC-52 | FR-06 | Course with no assignments shows 0% (no divide-by-zero)
  it('TC-52: shows 0% complete for a course with no assignments', async () => {
    server = mockServer({ 'GET /canvas/assignments/progress': progressData });
    render(<Assignments />);

    const summary = (await screen.findByText('Data Structures')).closest('summary');
    expect(summary).toHaveTextContent('0% complete');
    expect(summary).not.toHaveTextContent('NaN');
  });

  // TC-53 | NFR-03 | Error shown when workload progress cannot be loaded
  it('TC-53: shows an error alert when workload progress cannot be loaded', async () => {
    server = mockServer({ 'GET /canvas/assignments/progress': networkError() });
    render(<Assignments />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load assignment progress/i);
  });
});

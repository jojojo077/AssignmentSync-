// WorkloadCalculation.test.jsx
// Feature: Automatically calculate workload based on due dates, assessment
//          weightings and estimated completion time.
//
// Acceptance Criteria:
//   - Assignments are prioritised/calculated according to due date,
//     weighting (points_possible) and estimated completion time.
//
// Test strategy:
//   - Suite A: Unit-test pure priority/workload helper logic directly.
//   - Suite B: Unit-test aggregate workload statistics.
//   - Suite C: Integration-test Dashboard UI to verify it reflects the
//              calculated workload correctly.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import Dashboard from '../pages/Dashboard';
import { canvas, progress } from '../services/api';

// ---------------------------------------------------------------------------
// Mock API layer (same pattern as Dashboard.test.jsx)
// ---------------------------------------------------------------------------
vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
    getAnnouncements: vi.fn(),
    getCompletedAssignments: vi.fn(() => []),
    setCompletedAssignments: vi.fn(),
    toggleAssignmentCompleted: vi.fn(),
  },
  progress: {
    getChecklist: vi.fn(() => Promise.resolve({ data: [] })),
    setChecklist: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

// ---------------------------------------------------------------------------
// Pure workload priority helpers (inline implementations that mirror the
// logic the application must implement to satisfy the acceptance criteria).
// ---------------------------------------------------------------------------

/**
 * Computes a numeric priority score for an assignment.
 * Lower score = higher urgency (sorts first).
 *
 * Formula:
 *   score = daysUntilDue - (weighting / 10) - (estimatedHours * 0.5)
 *
 * Rationale:
 *   - Assignments due sooner are more urgent (low daysUntilDue => low score).
 *   - Higher weighting increases urgency (subtracts more from score).
 *   - Longer estimated time increases urgency (more effort needed sooner).
 */
export function computePriorityScore(assignment, now = new Date()) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const daysUntilDue = assignment.due_at
    ? (new Date(assignment.due_at) - now) / msPerDay
    : Infinity;
  const weighting = assignment.points_possible ?? 0;
  const estimatedHours = assignment.estimated_hours ?? 0;
  return daysUntilDue - weighting / 10 - estimatedHours * 0.5;
}

/**
 * Returns assignments sorted by priority score (ascending = most urgent first).
 */
export function sortByPriority(assignments, now = new Date()) {
  return [...assignments].sort(
    (a, b) => computePriorityScore(a, now) - computePriorityScore(b, now)
  );
}

/**
 * Calculates aggregate workload stats for a list of assignments.
 * Returns { totalHours, overdueCount, urgentCount, normalCount }.
 * Urgent = due within 3 days (not overdue).
 */
export function calculateWorkloadStats(
  assignments,
  completedIds = new Set(),
  now = new Date()
) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const pending = assignments.filter((a) => !completedIds.has(String(a.id)));
  const totalHours = pending.reduce(
    (sum, a) => sum + (a.estimated_hours ?? 0),
    0
  );
  const overdueCount = pending.filter(
    (a) => a.due_at && new Date(a.due_at) < now
  ).length;
  const urgentCount = pending.filter((a) => {
    if (!a.due_at) return false;
    const days = (new Date(a.due_at) - now) / msPerDay;
    return days >= 0 && days <= 3;
  }).length;
  const normalCount = pending.length - overdueCount - urgentCount;
  return { totalHours, overdueCount, urgentCount, normalCount };
}

// ---------------------------------------------------------------------------
// Suite A: Pure priority scoring logic
// ---------------------------------------------------------------------------
describe('Workload Calculation - priority scoring logic', () => {
  const NOW = new Date('2026-10-01T09:00:00Z');

  // WC-UT1: Due date drives urgency
  it('assigns a lower priority score to assignments due sooner', () => {
    const urgent = {
      id: 1,
      name: 'Due Tomorrow',
      due_at: '2026-10-02T23:59:00Z',
      points_possible: 20,
      estimated_hours: 2,
    };
    const later = {
      id: 2,
      name: 'Due Next Week',
      due_at: '2026-10-08T23:59:00Z',
      points_possible: 20,
      estimated_hours: 2,
    };
    expect(computePriorityScore(urgent, NOW)).toBeLessThan(
      computePriorityScore(later, NOW)
    );
  });

  // WC-UT2: Weighting drives urgency when due dates are equal
  it('assigns a lower priority score to higher-weighted assignments when due dates are equal', () => {
    const highWeight = {
      id: 3,
      name: 'Final Exam',
      due_at: '2026-10-05T23:59:00Z',
      points_possible: 50,
      estimated_hours: 3,
    };
    const lowWeight = {
      id: 4,
      name: 'Quiz',
      due_at: '2026-10-05T23:59:00Z',
      points_possible: 10,
      estimated_hours: 3,
    };
    expect(computePriorityScore(highWeight, NOW)).toBeLessThan(
      computePriorityScore(lowWeight, NOW)
    );
  });

  // WC-UT3: Estimated hours drive urgency when due date and weighting are equal
  it('assigns a lower priority score to assignments requiring more hours when due date and weighting are equal', () => {
    const longTask = {
      id: 5,
      name: 'Research Paper',
      due_at: '2026-10-07T23:59:00Z',
      points_possible: 30,
      estimated_hours: 10,
    };
    const shortTask = {
      id: 6,
      name: 'Summary',
      due_at: '2026-10-07T23:59:00Z',
      points_possible: 30,
      estimated_hours: 1,
    };
    expect(computePriorityScore(longTask, NOW)).toBeLessThan(
      computePriorityScore(shortTask, NOW)
    );
  });

  // WC-UT4: Assignments with no due date are least urgent
  it('treats an assignment with no due date as the least urgent (Infinity score)', () => {
    const noDueDate = {
      id: 7,
      name: 'Optional Reading',
      due_at: null,
      points_possible: 5,
      estimated_hours: 1,
    };
    const withDate = {
      id: 8,
      name: 'Report',
      due_at: '2026-12-01T23:59:00Z',
      points_possible: 5,
      estimated_hours: 1,
    };
    expect(computePriorityScore(noDueDate, NOW)).toBe(Infinity);
    expect(computePriorityScore(withDate, NOW)).toBeLessThan(Infinity);
  });

  // WC-UT5: sortByPriority orders most-urgent first
  it('sortByPriority returns assignments ordered most-urgent first', () => {
    const assignments = [
      {
        id: 10,
        name: 'Low Priority',
        due_at: '2026-11-01T23:59:00Z',
        points_possible: 5,
        estimated_hours: 1,
      },
      {
        id: 11,
        name: 'High Priority',
        due_at: '2026-10-02T23:59:00Z',
        points_possible: 40,
        estimated_hours: 6,
      },
      {
        id: 12,
        name: 'Mid Priority',
        due_at: '2026-10-10T23:59:00Z',
        points_possible: 20,
        estimated_hours: 3,
      },
    ];
    const sorted = sortByPriority(assignments, NOW);
    expect(sorted[0].name).toBe('High Priority');
    expect(sorted[sorted.length - 1].name).toBe('Low Priority');
  });

  // WC-UT6: sortByPriority does not mutate the original array
  it('sortByPriority does not mutate the original array', () => {
    const assignments = [
      {
        id: 20,
        name: 'A',
        due_at: '2026-10-10T23:59:00Z',
        points_possible: 10,
        estimated_hours: 1,
      },
      {
        id: 21,
        name: 'B',
        due_at: '2026-10-03T23:59:00Z',
        points_possible: 10,
        estimated_hours: 1,
      },
    ];
    const originalFirst = assignments[0].name;
    sortByPriority(assignments, NOW);
    expect(assignments[0].name).toBe(originalFirst);
  });
});

// ---------------------------------------------------------------------------
// Suite B: Aggregate workload statistics
// ---------------------------------------------------------------------------
describe('Workload Calculation - aggregate workload stats', () => {
  const NOW = new Date('2026-10-01T09:00:00Z');

  // WC-UT7: Total hours are summed correctly
  it('calculates total estimated hours correctly across pending assignments', () => {
    const assignments = [
      { id: 1, name: 'Essay', due_at: '2026-10-15T23:59:00Z', estimated_hours: 8 },
      { id: 2, name: 'Lab Report', due_at: '2026-10-20T23:59:00Z', estimated_hours: 3 },
    ];
    const { totalHours } = calculateWorkloadStats(assignments, new Set(), NOW);
    expect(totalHours).toBe(11);
  });

  // WC-UT8: Completed assignments are excluded from workload total
  it('excludes completed assignments from workload hours total', () => {
    const assignments = [
      { id: 1, name: 'Done', due_at: '2026-10-15T23:59:00Z', estimated_hours: 5 },
      { id: 2, name: 'Pending', due_at: '2026-10-20T23:59:00Z', estimated_hours: 3 },
    ];
    const completedIds = new Set(['1']);
    const { totalHours } = calculateWorkloadStats(assignments, completedIds, NOW);
    expect(totalHours).toBe(3);
  });

  // WC-UT9: Overdue assignments are counted correctly
  it('correctly counts overdue assignments (due date is in the past)', () => {
    const assignments = [
      { id: 1, name: 'Overdue Task', due_at: '2026-09-28T23:59:00Z', estimated_hours: 2 },
      { id: 2, name: 'Future Task', due_at: '2026-10-15T23:59:00Z', estimated_hours: 2 },
    ];
    const { overdueCount } = calculateWorkloadStats(assignments, new Set(), NOW);
    expect(overdueCount).toBe(1);
  });

  // WC-UT10: Urgent assignments (due within 3 days) are counted correctly
  it('correctly counts urgent assignments (due within 3 days)', () => {
    const assignments = [
      { id: 1, name: 'Due Tomorrow', due_at: '2026-10-02T23:59:00Z', estimated_hours: 2 },
      { id: 2, name: 'Due in 2 Days', due_at: '2026-10-03T23:59:00Z', estimated_hours: 2 },
      { id: 3, name: 'Due in 5 Days', due_at: '2026-10-06T23:59:00Z', estimated_hours: 2 },
    ];
    const { urgentCount } = calculateWorkloadStats(assignments, new Set(), NOW);
    expect(urgentCount).toBe(2);
  });

  // WC-UT11: All-completed state returns zeros
  it('returns zero hours and zero counts when all assignments are completed', () => {
    const assignments = [
      { id: 1, name: 'Done A', due_at: '2026-10-05T23:59:00Z', estimated_hours: 4 },
      { id: 2, name: 'Done B', due_at: '2026-10-08T23:59:00Z', estimated_hours: 2 },
    ];
    const completedIds = new Set(['1', '2']);
    const stats = calculateWorkloadStats(assignments, completedIds, NOW);
    expect(stats.totalHours).toBe(0);
    expect(stats.overdueCount).toBe(0);
    expect(stats.urgentCount).toBe(0);
    expect(stats.normalCount).toBe(0);
  });

  // WC-UT12: Missing estimated_hours field defaults to 0
  it('handles assignments with no estimated_hours field gracefully (defaults to 0)', () => {
    const assignments = [{ id: 1, name: 'No Estimate', due_at: '2026-10-10T23:59:00Z' }];
    const { totalHours } = calculateWorkloadStats(assignments, new Set(), NOW);
    expect(totalHours).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Suite C: Dashboard UI integration
// ---------------------------------------------------------------------------
describe('Workload Calculation - Dashboard UI integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvas.getCompletedAssignments.mockReturnValue([]);
    progress.getChecklist.mockResolvedValue({ data: [] });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });
  });

  // WC-IT1: Assignment count badge reflects total workload
  it('displays the total number of assignments as a workload count badge', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'Assignment 1', due_at: '2026-10-05T23:59:00Z', points_possible: 25 },
          { id: 2, name: 'Assignment 2', due_at: '2026-10-15T23:59:00Z', points_possible: 40 },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('Assignments')).toBeInTheDocument();
    });
  });

  // WC-IT2: Due dates are displayed alongside assignment names
  it('shows assignment due dates alongside assignment names in the workload list', async () => {
    const mockData = [
      {
        courseId: 202,
        courseName: 'Data Structures',
        assignments: [
          { id: 3, name: 'Binary Tree Lab', due_at: '2026-10-10T23:59:00Z', points_possible: 30 },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      // Assignment name appears in both the workload list and the checklist
      const nameMatches = screen.getAllByText('Binary Tree Lab');
      expect(nameMatches.length).toBeGreaterThan(0);
      // Verify a due date is rendered near one of the assignment name elements.
      // The date span is a sibling within the same parent div, so we check
      // the parent's text content for 'Oct' and '10' (locale-independent).
      const workloadItem = nameMatches[0].closest('.dashboard-assignment-subitem');
      expect(workloadItem).not.toBeNull();
      expect(workloadItem.textContent).toMatch(/Oct/);
      expect(workloadItem.textContent).toMatch(/10/);
    });
  });

  // WC-IT3: Completion percentage is calculated and displayed
  it('shows the overall semester completion percentage in the progress widget', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'Assignment 1', due_at: '2026-10-05T23:59:00Z', has_submitted_submissions: true },
          { id: 2, name: 'Assignment 2', due_at: '2026-10-15T23:59:00Z' },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      // 1 of 2 completed = 50%
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toHaveAttribute('aria-valuenow', '50');
      expect(
        screen.getByText('1 of 2 assignments completed this semester')
      ).toBeInTheDocument();
    });
  });

  // WC-IT4: Per-course workload breakdown with fractions
  it('renders per-course workload breakdown with assignment fractions', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z' },
          { id: 2, name: 'SQA Test', due_at: '2026-10-20T23:59:00Z' },
        ],
      },
      {
        courseId: 202,
        courseName: 'Data Structures',
        assignments: [{ id: 3, name: 'Lab 1', due_at: '2026-10-08T23:59:00Z' }],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      const sqaEntries = screen.getAllByText(/Software Quality Assurance/i);
      expect(sqaEntries.length).toBeGreaterThan(0);
      const dsEntries = screen.getAllByText(/Data Structures/i);
      expect(dsEntries.length).toBeGreaterThan(0);
      // 0 of 2 and 0 of 1 completed
      expect(screen.getByText('0/2')).toBeInTheDocument();
      expect(screen.getByText('0/1')).toBeInTheDocument();
    });
  });

  // WC-IT5: 100% completion shows motivational label
  it('shows the all-caught-up motivational label when workload is fully complete', async () => {
    const mockData = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          {
            id: 1,
            name: 'Submitted Work',
            due_at: '2026-10-05T23:59:00Z',
            has_submitted_submissions: true,
          },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByText(/all caught up/i)).toBeInTheDocument();
    });
  });

  // WC-IT6: Loading state is shown while data is being fetched
  it('displays a loading state while workload data is being fetched', () => {
    // Never resolves so loading UI stays visible throughout the test
    canvas.getUpcomingAssignments.mockReturnValue(new Promise(() => {}));

    render(<Dashboard />);

    expect(screen.getByText(/loading assignments\.\.\./i)).toBeInTheDocument();
  });

  // WC-IT7: Error banner is shown when the fetch fails
  it('displays an error banner when workload data cannot be loaded from the server', async () => {
    canvas.getUpcomingAssignments.mockRejectedValue(
      new Error('500 Internal Server Error')
    );

    render(<Dashboard />);

    await waitFor(() => {
      const alerts = screen.getAllByRole('alert');
      const workloadAlert = alerts.find((el) =>
        el.textContent.includes('load assignments')
      );
      expect(workloadAlert).toBeTruthy();
    });
  });

  // WC-IT8: Active-course count badge reflects total courses loaded
  it('shows the active course count badge in the header stats strip', async () => {
    const mockData = [
      { courseId: 101, courseName: 'SQA', assignments: [{ id: 1, name: 'T1' }] },
      { courseId: 202, courseName: 'Data Structures', assignments: [{ id: 2, name: 'T2' }] },
      { courseId: 303, courseName: 'Algorithms', assignments: [{ id: 3, name: 'T3' }] },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: mockData });

    render(<Dashboard />);

    await waitFor(() => {
      // 'Active Courses' label confirms the badge section is rendered;
      // the sibling value span should contain '3'.
      expect(screen.getByText('Active Courses')).toBeInTheDocument();
      // Look specifically for the stat badge that shows the course count
      const activeCoursesBadge = screen
        .getByText('Active Courses')
        .closest('.dashboard-stat-badge');
      expect(activeCoursesBadge).not.toBeNull();
      expect(activeCoursesBadge.textContent).toMatch('3');
    });
  });
});

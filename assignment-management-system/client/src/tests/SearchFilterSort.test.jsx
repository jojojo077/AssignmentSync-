// SearchFilterSort.test.jsx
// Feature: Search, filter and sort assignments by course, due date,
//          priority and completion status.
//
// Acceptance Criteria:
//   - Users can successfully search, filter and sort assignments using
//     each supported criterion (course, due date, priority, completion status).
//
// Test strategy:
//   - Suite A: Unit-test pure filter/sort helper functions.
//   - Suite B: Integration-test the SearchAssignments component
//              (search by course code).
//   - Suite C: Integration-test the Dashboard checklist filter
//              (filter by completion status).

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SearchAssignments from '../pages/SearchAssignments';
import Dashboard from '../pages/Dashboard';
import { canvas, progress } from '../services/api';

// ---------------------------------------------------------------------------
// Mock API layer
// ---------------------------------------------------------------------------
vi.mock('../services/api', () => ({
  canvas: {
    getUpcomingAssignments: vi.fn(),
    getAnnouncements: vi.fn(),
    getCompletedAssignments: vi.fn(() => []),
    setCompletedAssignments: vi.fn(),
    toggleAssignmentCompleted: vi.fn(),
    getCourses: vi.fn(),
    searchAssignmentsByCourseCode: vi.fn(),
  },
  progress: {
    getChecklist: vi.fn(() => Promise.resolve({ data: [] })),
    setChecklist: vi.fn(() => Promise.resolve({ data: [] })),
  },
}));

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------
const MOCK_ASSIGNMENTS = [
  {
    id: 1,
    name: 'Introduction Essay',
    courseName: 'English Literature',
    courseId: 101,
    due_at: '2026-10-15T23:59:00Z',
    points_possible: 20,
  },
  {
    id: 2,
    name: 'Data Structures Lab',
    courseName: 'Computer Science',
    courseId: 202,
    due_at: '2026-10-03T23:59:00Z',
    points_possible: 50,
  },
  {
    id: 3,
    name: 'History Reflection',
    courseName: 'History',
    courseId: 303,
    due_at: '2026-11-01T23:59:00Z',
    points_possible: 30,
  },
  {
    id: 4,
    name: 'Statistics Assignment',
    courseName: 'Computer Science',
    courseId: 202,
    due_at: '2026-10-20T23:59:00Z',
    points_possible: 40,
  },
];

// ---------------------------------------------------------------------------
// Pure helper implementations (mirrors what the application must provide)
// ---------------------------------------------------------------------------

/** Filter assignments to only those matching a course name (case-insensitive). */
export function filterByCourse(assignments, courseQuery) {
  if (!courseQuery || !courseQuery.trim()) return assignments;
  const q = courseQuery.trim().toLowerCase();
  return assignments.filter((a) =>
    (a.courseName || '').toLowerCase().includes(q)
  );
}

/** Filter assignments by completion status. */
export function filterByStatus(assignments, status, completedIds = new Set()) {
  if (status === 'completed')
    return assignments.filter((a) => completedIds.has(String(a.id)));
  if (status === 'pending')
    return assignments.filter((a) => !completedIds.has(String(a.id)));
  return assignments; // 'all'
}

/** Filter assignments to those whose name contains the search query. */
export function filterByName(assignments, query) {
  if (!query || !query.trim()) return assignments;
  const q = query.trim().toLowerCase();
  return assignments.filter((a) => (a.name || '').toLowerCase().includes(q));
}

/** Sort assignments by due date (ascending = soonest first). */
export function sortByDueDate(assignments) {
  return [...assignments].sort((a, b) => {
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return new Date(a.due_at) - new Date(b.due_at);
  });
}

/** Sort assignments by points_possible descending (highest weighting first). */
export function sortByPriorityWeight(assignments) {
  return [...assignments].sort(
    (a, b) => (b.points_possible ?? 0) - (a.points_possible ?? 0)
  );
}

// ---------------------------------------------------------------------------
// Suite A: Pure filter and sort logic
// ---------------------------------------------------------------------------
describe('Search, Filter and Sort - pure helper logic', () => {
  // SF-UT1: filterByCourse matches on course name
  it('filterByCourse returns only assignments matching the given course name', () => {
    const results = filterByCourse(MOCK_ASSIGNMENTS, 'computer science');
    expect(results).toHaveLength(2);
    expect(results.every((a) => a.courseName === 'Computer Science')).toBe(true);
  });

  // SF-UT2: filterByCourse is case-insensitive
  it('filterByCourse is case-insensitive', () => {
    const lower = filterByCourse(MOCK_ASSIGNMENTS, 'history');
    const upper = filterByCourse(MOCK_ASSIGNMENTS, 'HISTORY');
    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    expect(lower[0].id).toBe(upper[0].id);
  });

  // SF-UT3: filterByCourse with empty query returns all assignments
  it('filterByCourse with an empty query returns all assignments', () => {
    expect(filterByCourse(MOCK_ASSIGNMENTS, '')).toHaveLength(MOCK_ASSIGNMENTS.length);
    expect(filterByCourse(MOCK_ASSIGNMENTS, '  ')).toHaveLength(MOCK_ASSIGNMENTS.length);
  });

  // SF-UT4: filterByCourse with no match returns empty array
  it('filterByCourse returns an empty array when no assignments match', () => {
    const results = filterByCourse(MOCK_ASSIGNMENTS, 'ENSE707');
    expect(results).toHaveLength(0);
  });

  // SF-UT5: filterByStatus - completed filter
  it('filterByStatus returns only completed assignments when status is "completed"', () => {
    const completedIds = new Set(['1', '3']);
    const results = filterByStatus(MOCK_ASSIGNMENTS, 'completed', completedIds);
    expect(results).toHaveLength(2);
    expect(results.map((a) => a.id)).toEqual(expect.arrayContaining([1, 3]));
  });

  // SF-UT6: filterByStatus - pending filter
  it('filterByStatus returns only pending assignments when status is "pending"', () => {
    const completedIds = new Set(['1', '3']);
    const results = filterByStatus(MOCK_ASSIGNMENTS, 'pending', completedIds);
    expect(results).toHaveLength(2);
    expect(results.map((a) => a.id)).toEqual(expect.arrayContaining([2, 4]));
  });

  // SF-UT7: filterByStatus - all filter returns everything
  it('filterByStatus returns all assignments when status is "all"', () => {
    const completedIds = new Set(['2']);
    const results = filterByStatus(MOCK_ASSIGNMENTS, 'all', completedIds);
    expect(results).toHaveLength(MOCK_ASSIGNMENTS.length);
  });

  // SF-UT8: filterByName matches partial name substring
  it('filterByName returns assignments whose name contains the search query', () => {
    const results = filterByName(MOCK_ASSIGNMENTS, 'lab');
    expect(results).toHaveLength(1);
    expect(results[0].name).toBe('Data Structures Lab');
  });

  // SF-UT9: filterByName is case-insensitive
  it('filterByName performs a case-insensitive match', () => {
    const lower = filterByName(MOCK_ASSIGNMENTS, 'essay');
    const upper = filterByName(MOCK_ASSIGNMENTS, 'ESSAY');
    expect(lower).toHaveLength(1);
    expect(upper).toHaveLength(1);
    expect(lower[0].id).toBe(upper[0].id);
  });

  // SF-UT10: sortByDueDate orders soonest first
  it('sortByDueDate returns assignments ordered soonest due date first', () => {
    const sorted = sortByDueDate(MOCK_ASSIGNMENTS);
    const dates = sorted.map((a) => new Date(a.due_at).getTime());
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
    }
  });

  // SF-UT11: sortByDueDate places assignments with no due date last
  it('sortByDueDate places assignments with no due date at the end', () => {
    const withNullDue = [
      ...MOCK_ASSIGNMENTS,
      { id: 99, name: 'No Due Date', courseName: 'Test', due_at: null, points_possible: 10 },
    ];
    const sorted = sortByDueDate(withNullDue);
    expect(sorted[sorted.length - 1].id).toBe(99);
  });

  // SF-UT12: sortByPriorityWeight orders highest weighting first
  it('sortByPriorityWeight returns assignments ordered highest weighting first', () => {
    const sorted = sortByPriorityWeight(MOCK_ASSIGNMENTS);
    const weights = sorted.map((a) => a.points_possible);
    for (let i = 1; i < weights.length; i++) {
      expect(weights[i]).toBeLessThanOrEqual(weights[i - 1]);
    }
  });

  // SF-UT13: Combining filterByCourse + sortByDueDate
  it('filtering by course and sorting by due date produces a correct combined result', () => {
    const filtered = filterByCourse(MOCK_ASSIGNMENTS, 'Computer Science');
    const sorted = sortByDueDate(filtered);
    expect(sorted).toHaveLength(2);
    // Data Structures Lab (Oct 3) must come before Statistics Assignment (Oct 20)
    expect(sorted[0].name).toBe('Data Structures Lab');
    expect(sorted[1].name).toBe('Statistics Assignment');
  });
});

// ---------------------------------------------------------------------------
// Suite B: SearchAssignments component (search by course code)
// ---------------------------------------------------------------------------
describe('Search, Filter and Sort - SearchAssignments component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvas.getCourses.mockResolvedValue({ data: [] });
  });

  // SF-IT1: Initial idle state shows prompt
  it('shows an idle prompt on initial render before any search is submitted', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });

    render(<SearchAssignments />);

    await waitFor(() => {
      expect(
        screen.getByText(/enter a course code above to see its assignments/i)
      ).toBeInTheDocument();
    });
  });

  // SF-IT2: Active courses are listed when available
  it('displays active course codes retrieved from the API', async () => {
    canvas.getCourses.mockResolvedValue({
      data: [
        { course_code: 'ENSE701' },
        { course_code: 'ENSE707' },
      ],
    });

    render(<SearchAssignments />);

    // The component renders active courses in a single <b> inside a <p>.
    // We look for a text node whose content includes both course codes.
    await waitFor(() => {
      const el = screen.getByText(/ENSE701.*ENSE707|ENSE707.*ENSE701/i);
      expect(el).toBeInTheDocument();
    });
  });

  // SF-IT3: Successful search by course code renders assignments
  it('renders matching assignments and course name after a successful search', async () => {
    canvas.getCourses.mockResolvedValue({ data: [{ course_code: 'COMP202' }] });
    canvas.searchAssignmentsByCourseCode.mockResolvedValue({
      data: [
        {
          courseId: 202,
          courseName: 'Data Structures',
          assignments: [
            { id: 2, name: 'Binary Tree Lab', due_at: '2026-10-03T23:59:00Z' },
          ],
        },
      ],
    });

    render(<SearchAssignments />);

    // Type a course code and submit
    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'COMP202' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Data Structures/i)).toBeInTheDocument();
      expect(screen.getByText(/Binary Tree Lab/i)).toBeInTheDocument();
    });
  });

  // SF-IT4: Due date is displayed for each search result assignment
  it('shows the due date for each assignment in the search results', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });
    canvas.searchAssignmentsByCourseCode.mockResolvedValue({
      data: [
        {
          courseId: 101,
          courseName: 'English Literature',
          assignments: [
            { id: 1, name: 'Introduction Essay', due_at: '2026-10-15T23:59:00Z' },
          ],
        },
      ],
    });

    render(<SearchAssignments />);

    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'ENGL101' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/Introduction Essay/i)).toBeInTheDocument();
      // Due date is rendered in a sibling span inside .dashboard-assignment-subitem.
      // Check the parent container's text for 'Oct' and '15' (locale-independent).
      const essayEl = screen.getByText(/Introduction Essay/i);
      const subitem = essayEl.closest('.dashboard-assignment-subitem');
      expect(subitem).not.toBeNull();
      expect(subitem.textContent).toMatch(/Oct/);
      expect(subitem.textContent).toMatch(/15/);
    });
  });

  // SF-IT5: Empty result state when no assignments match course code
  it('shows a no-results message when the search returns no matching courses', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });
    canvas.searchAssignmentsByCourseCode.mockResolvedValue({ data: [] });

    render(<SearchAssignments />);

    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'ZZZZ999' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/no courses matched/i)).toBeInTheDocument();
    });
  });

  // SF-IT6: Error state is shown when search API fails
  it('displays an error alert when the search API request fails', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });
    canvas.searchAssignmentsByCourseCode.mockRejectedValue({
      response: { data: { message: 'Course not found' } },
    });

    render(<SearchAssignments />);

    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'BAD999' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/course not found/i)).toBeInTheDocument();
    });
  });

  // SF-IT7: Submit button is disabled when the input is blank
  it('disables the search button when the course code input is empty', () => {
    canvas.getCourses.mockResolvedValue({ data: [] });

    render(<SearchAssignments />);

    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();
  });

  // SF-IT8: Submit button becomes enabled after typing a course code
  it('enables the search button after the user types a course code', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });

    render(<SearchAssignments />);

    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'ENSE701' },
    });

    await waitFor(() => {
      expect(button).not.toBeDisabled();
    });
  });

  // SF-IT9: Search results show assignment count per course
  it('shows the number of assignments for each course in the search results', async () => {
    canvas.getCourses.mockResolvedValue({ data: [] });
    canvas.searchAssignmentsByCourseCode.mockResolvedValue({
      data: [
        {
          courseId: 202,
          courseName: 'Computer Science',
          assignments: [
            { id: 2, name: 'Lab 1', due_at: '2026-10-03T23:59:00Z' },
            { id: 4, name: 'Lab 2', due_at: '2026-10-20T23:59:00Z' },
          ],
        },
      ],
    });

    render(<SearchAssignments />);

    fireEvent.change(screen.getByLabelText(/course code/i), {
      target: { value: 'CS202' },
    });
    fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));

    await waitFor(() => {
      expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    });
  });
});

// ---------------------------------------------------------------------------
// Suite C: Dashboard checklist filter (filter by completion status)
// ---------------------------------------------------------------------------
describe('Search, Filter and Sort - Dashboard completion status filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    canvas.getCompletedAssignments.mockReturnValue([]);
    progress.getChecklist.mockResolvedValue({ data: [] });
    canvas.getAnnouncements.mockResolvedValue({ data: [] });
  });

  const TWO_COURSE_DATA = [
    {
      courseId: 101,
      courseName: 'Software Quality Assurance',
      assignments: [
        { id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z', has_submitted_submissions: true },
        { id: 2, name: 'SQA Test', due_at: '2026-10-20T23:59:00Z' },
      ],
    },
  ];

  // SF-IT10: Default "All" filter shows all checklist items
  it('shows all assignments in the checklist when the "All" filter is active', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: TWO_COURSE_DATA });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /mark SQA Essay as incomplete/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /mark SQA Test as complete/i })).toBeInTheDocument();
    });
  });

  // SF-IT11: "Completed" filter shows only completed assignments
  it('shows only completed assignments when the "Completed" filter button is clicked', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: TWO_COURSE_DATA });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /completed/i }));

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /mark SQA Essay as incomplete/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: /mark SQA Test as complete/i })
      ).not.toBeInTheDocument();
    });
  });

  // SF-IT12: "Pending" filter shows only incomplete assignments
  it('shows only pending assignments when the "Pending" filter button is clicked', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: TWO_COURSE_DATA });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pending/i }));

    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /mark SQA Test as complete/i })).toBeInTheDocument();
      expect(
        screen.queryByRole('checkbox', { name: /mark SQA Essay as incomplete/i })
      ).not.toBeInTheDocument();
    });
  });

  // SF-IT13: Switching back to "All" after a filter restores all items
  it('restores all checklist items when switching from "Pending" back to "All"', async () => {
    canvas.getUpcomingAssignments.mockResolvedValue({ data: TWO_COURSE_DATA });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /all/i })).toBeInTheDocument();
    });

    // Switch to Pending
    fireEvent.click(screen.getByRole('button', { name: /pending/i }));
    await waitFor(() => {
      expect(
        screen.queryByRole('checkbox', { name: /mark SQA Essay as incomplete/i })
      ).not.toBeInTheDocument();
    });

    // Switch back to All
    fireEvent.click(screen.getByRole('button', { name: /all/i }));
    await waitFor(() => {
      expect(screen.getByRole('checkbox', { name: /mark SQA Essay as incomplete/i })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: /mark SQA Test as complete/i })).toBeInTheDocument();
    });
  });

  // SF-IT14: "Completed" filter with no completed items shows empty message
  it('shows a no-completed-assignments message when the filter returns no results', async () => {
    const noneCompleted = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z' },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: noneCompleted });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /completed/i }));

    await waitFor(() => {
      expect(screen.getByText(/no completed assignments yet/i)).toBeInTheDocument();
    });
  });

  // SF-IT15: "Pending" filter with no pending items shows empty message
  it('shows a no-pending-assignments message when all assignments are already complete', async () => {
    const allDone = [
      {
        courseId: 101,
        courseName: 'Software Quality Assurance',
        assignments: [
          { id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z', has_submitted_submissions: true },
        ],
      },
    ];
    canvas.getUpcomingAssignments.mockResolvedValue({ data: allDone });

    render(<Dashboard />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /pending/i }));

    await waitFor(() => {
      expect(screen.getByText(/no pending assignments/i)).toBeInTheDocument();
    });
  });
});

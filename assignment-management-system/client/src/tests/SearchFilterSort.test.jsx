// SearchFilterSort.test.jsx
// Requirement:
//   FR-07  Search, filter and sort assignments by course, due date, priority
//          and completion status
//          AC: users can search, filter and sort assignments using each
//              supported criterion
//
// Exercises the real application features that implement FR-07:
//   - Search by course code .......... src/pages/SearchAssignments.jsx
//   - Filter by completion status .... Dashboard checklist filter
//   - Filter by course ............... Calendar "Filter Papers" chips
//   - Sort by due date ............... Calendar Agenda view
// Only HTTP is faked (see helpers/mockServer.js).
//
// Coverage note: there is no priority sort/filter in the client, so the
// "priority" criterion of FR-07 is not covered - see the RTM.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import SearchAssignments from '../pages/SearchAssignments';
import Dashboard from '../pages/Dashboard';
import Calendar from '../pages/Calendar';
import { mockServer, status } from './helpers/mockServer';
import { renderWithAuth } from './helpers/renderHelpers';

let server;
beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
});

function searchFor(code) {
  fireEvent.change(screen.getByLabelText(/course code/i), { target: { value: code } });
  fireEvent.submit(screen.getByRole('button', { name: /search/i }).closest('form'));
}

// ---------------------------------------------------------------------------
// Search by course code
// ---------------------------------------------------------------------------
describe('Search - by course code', () => {
  function startSearch(searchHandler, courses = []) {
    server = mockServer({
      'GET /canvas/courses': courses,
      'GET /canvas/assignments/search': searchHandler,
    });
  }

  // TC-54 | FR-07 | Idle prompt before searching
  it('TC-54: shows an idle prompt before any search is submitted', async () => {
    startSearch([]);
    render(<SearchAssignments />);

    expect(await screen.findByText(/enter a course code above to see its assignments/i)).toBeInTheDocument();
    expect(server.callsTo('GET /canvas/assignments/search')).toHaveLength(0);
  });

  // TC-55 | FR-07 | Active course codes listed
  it('TC-55: lists the active course codes retrieved from Canvas', async () => {
    startSearch([], [{ course_code: 'ENSE701' }, { course_code: 'ENSE707' }]);
    render(<SearchAssignments />);

    expect(await screen.findByText('ENSE701, ENSE707')).toBeInTheDocument();
  });

  // TC-56 | FR-07 | Matching assignments shown after a search
  it('TC-56: searches Canvas by the entered course code and shows the matching course and assignments', async () => {
    startSearch([
      {
        courseId: 202,
        courseName: 'Data Structures',
        assignments: [
          { id: 2, name: 'Binary Tree Lab', due_at: '2026-10-03T23:59:00Z' },
          { id: 4, name: 'Graph Lab', due_at: '2026-10-20T23:59:00Z' },
        ],
      },
    ]);
    render(<SearchAssignments />);

    searchFor('  COMP202  ');

    expect(await screen.findByText('Data Structures')).toBeInTheDocument();
    expect(screen.getByText('Binary Tree Lab')).toBeInTheDocument();
    expect(screen.getByText('Graph Lab')).toBeInTheDocument();
    expect(screen.getByText(/2 assignment\(s\)/i)).toBeInTheDocument();
    // Input is trimmed before it is sent to the API
    expect(server.callsTo('GET /canvas/assignments/search')[0].params).toEqual({ courseCode: 'COMP202' });
  });

  // TC-57 | FR-07 | Due date shown for each result
  it('TC-57: shows the due date for each assignment in the search results', async () => {
    startSearch([
      {
        courseId: 101,
        courseName: 'English Literature',
        assignments: [{ id: 1, name: 'Introduction Essay', due_at: '2026-10-15T23:59:00Z' }],
      },
    ]);
    render(<SearchAssignments />);

    searchFor('ENGL101');

    const item = (await screen.findByText('Introduction Essay')).closest('.dashboard-assignment-subitem');
    expect(item).toHaveTextContent('Due Oct 15, 2026');
  });

  // TC-58 | FR-07 | No-results message
  it('TC-58: shows a no-results message when no course matches the search', async () => {
    startSearch([]);
    render(<SearchAssignments />);

    searchFor('ZZZZ999');

    expect(await screen.findByText(/no courses matched "ZZZZ999"/i)).toBeInTheDocument();
  });

  // TC-59 | FR-07 | Search failure shows the server error
  it('TC-59: shows an error alert with the server message when the search request fails', async () => {
    startSearch(status(404, { message: 'Course not found' }));
    render(<SearchAssignments />);

    searchFor('BAD999');

    expect(await screen.findByRole('alert')).toHaveTextContent(/course not found/i);
  });

  // TC-60 | FR-07 | Search button disabled until a course code is entered
  it('TC-60: keeps the search button disabled until a non-blank course code is entered', async () => {
    startSearch([]);
    render(<SearchAssignments />);

    const button = screen.getByRole('button', { name: /search/i });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/course code/i), { target: { value: '   ' } });
    expect(button).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/course code/i), { target: { value: 'ENSE701' } });
    await waitFor(() => expect(button).not.toBeDisabled());
  });
});

// ---------------------------------------------------------------------------
// Filter by completion status (Dashboard checklist)
// ---------------------------------------------------------------------------
describe('Filter - by completion status', () => {
  function startDashboard(assignments) {
    server = mockServer({
      'GET /canvas/assignments': assignments,
      'GET /canvas/announcements': [],
      'GET /progress/checklist': [],
      'PUT /progress/checklist': [],
    });
  }

  const MIXED = [
    {
      courseId: 101,
      courseName: 'Software Quality Assurance',
      assignments: [
        { id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z', has_submitted_submissions: true },
        { id: 2, name: 'SQA Test', due_at: '2026-10-20T23:59:00Z' },
      ],
    },
  ];
  const essay = () => screen.queryByRole('checkbox', { name: /mark SQA Essay as incomplete/i });
  const test = () => screen.queryByRole('checkbox', { name: /mark SQA Test as complete/i });

  // TC-61 | FR-07 | "All" filter shows every assignment by default
  it('TC-61: shows every assignment in the checklist with the default "All" filter', async () => {
    startDashboard(MIXED);
    renderWithAuth(<Dashboard />);

    await waitFor(() => {
      expect(essay()).toBeInTheDocument();
      expect(test()).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: /^all$/i })).toHaveClass('checklist-filter-btn--active');
  });

  // TC-62 | FR-07 | "Completed" filter
  it('TC-62: shows only completed assignments when "Completed" is selected', async () => {
    startDashboard(MIXED);
    renderWithAuth(<Dashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /^completed$/i }));

    await waitFor(() => {
      expect(essay()).toBeInTheDocument();
      expect(test()).not.toBeInTheDocument();
    });
  });

  // TC-63 | FR-07 | "Pending" filter
  it('TC-63: shows only pending assignments when "Pending" is selected', async () => {
    startDashboard(MIXED);
    renderWithAuth(<Dashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /^pending$/i }));

    await waitFor(() => {
      expect(test()).toBeInTheDocument();
      expect(essay()).not.toBeInTheDocument();
    });
  });

  // TC-64 | FR-07 | Switching back to "All" restores the list
  it('TC-64: restores all checklist items when switching from "Pending" back to "All"', async () => {
    startDashboard(MIXED);
    renderWithAuth(<Dashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /^pending$/i }));
    await waitFor(() => expect(essay()).not.toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    await waitFor(() => {
      expect(essay()).toBeInTheDocument();
      expect(test()).toBeInTheDocument();
    });
  });

  // TC-65 | FR-07 | Empty "Completed" result
  it('TC-65: shows a "no completed assignments" message when nothing is complete', async () => {
    startDashboard([
      { courseId: 101, courseName: 'SQA', assignments: [{ id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z' }] },
    ]);
    renderWithAuth(<Dashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /^completed$/i }));

    expect(await screen.findByText(/no completed assignments yet/i)).toBeInTheDocument();
  });

  // TC-66 | FR-07 | Empty "Pending" result
  it('TC-66: shows a "no pending assignments" message when everything is complete', async () => {
    startDashboard([
      {
        courseId: 101,
        courseName: 'SQA',
        assignments: [{ id: 1, name: 'SQA Essay', due_at: '2026-10-05T23:59:00Z', has_submitted_submissions: true }],
      },
    ]);
    renderWithAuth(<Dashboard />);

    fireEvent.click(await screen.findByRole('button', { name: /^pending$/i }));

    expect(await screen.findByText(/no pending assignments/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Filter by course and sort by due date (Calendar)
// ---------------------------------------------------------------------------
describe('Filter and sort - Calendar', () => {
  const TWO_COURSES = [
    {
      courseId: 101,
      courseName: 'Software Quality Assurance',
      assignments: [
        { id: 11, name: 'SQA Final Report', due_at: '2026-10-20T23:59:00Z' },
        { id: 12, name: 'SQA Test Plan', due_at: '2026-10-02T23:59:00Z' },
      ],
    },
    {
      courseId: 202,
      courseName: 'Data Structures',
      assignments: [{ id: 21, name: 'DS Graph Lab', due_at: '2026-10-10T23:59:00Z' }],
    },
  ];

  function startCalendar() {
    server = mockServer({ 'GET /canvas/assignments': TWO_COURSES, 'GET /canvas/events': [] });
  }

  // TC-67 | FR-07 | Filter by course
  it('TC-67: hides and re-shows a course\'s assignments when its course filter chip is toggled', async () => {
    startCalendar();
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    expect(screen.getByText('DS Graph Lab')).toBeInTheDocument();

    const chip = screen.getByRole('button', { name: 'Data Structures' });
    fireEvent.click(chip);
    expect(chip).toHaveClass('course-chip--inactive');
    expect(screen.queryByText('DS Graph Lab')).not.toBeInTheDocument();
    expect(screen.getByText('SQA Final Report')).toBeInTheDocument();

    fireEvent.click(chip);
    expect(chip).toHaveClass('course-chip--active');
    expect(screen.getByText('DS Graph Lab')).toBeInTheDocument();
  });

  // TC-68 | FR-07 | Sort by due date
  it('TC-68: lists assignments across courses in due-date order in the Agenda view', async () => {
    startCalendar();
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));

    const titles = (await screen.findAllByRole('heading', { level: 4 })).map((h) => h.textContent);
    expect(titles).toEqual(['SQA Test Plan', 'DS Graph Lab', 'SQA Final Report']);
  });
});

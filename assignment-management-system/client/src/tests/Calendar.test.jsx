// Calendar.test.jsx
// Requirements:
//   FR-04  Calendar with daily, weekly and monthly views
//          AC: users can switch between views and see relevant events
//   FR-05  Insert events into calendar space
//          AC: user input is shown on the calendar; input is saved
//   NFR-03 Canvas requests handled with appropriate error handling
//
// Renders the real Calendar page with the real calendar components and the
// real canvas service (src/services/api.js). Only HTTP is faked.
//
// Note on FR-04 "daily" view: the shipped view modes are Month, Week and
// Agenda. There is no single-day view, so the daily part of FR-04 has no
// test - see the RTM.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import Calendar from '../pages/Calendar';
import { mockServer, status, networkError } from './helpers/mockServer';

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

let server;
function startServer(overrides = {}) {
  server = mockServer({
    'GET /canvas/assignments': mockCoursesData,
    'GET /canvas/events': [],
    ...overrides,
  });
  return server;
}

// Pin "today" to the week of 23 Aug 2026 so Month/Week views show the
// fixture assignment. Only Date is faked, so promises/timers run normally.
function pinToday(iso = '2026-08-25T12:00:00Z') {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(iso));
}

async function openAddEventAndSave(title, date) {
  fireEvent.click(await screen.findByRole('button', { name: /\+ Add Event/i }));
  fireEvent.change(screen.getByLabelText(/Event Title \*/i), { target: { value: title } });
  fireEvent.change(screen.getByLabelText(/Date \*/i), { target: { value: date } });
  fireEvent.click(screen.getByRole('button', { name: /Save Event/i }));
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
  vi.useRealTimers();
});

// ---------------------------------------------------------------------------
// FR-04 Views
// ---------------------------------------------------------------------------
describe('Calendar - views (FR-04)', () => {
  // TC-10 | FR-04 | Renders loading state then calendar contents
  it('TC-10: renders a loading state and then the calendar contents', async () => {
    startServer();
    render(<Calendar />);

    expect(screen.getByText(/loading calendar data/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /assignment calendar/i })).toBeInTheDocument();
      expect(screen.getByText(/Software Quality Assurance 2026 S2/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/loading calendar data/i)).not.toBeInTheDocument();
  });

  // TC-31 | FR-04 | Month is the default view
  it('TC-31: defaults to the Month view on first render', async () => {
    startServer();
    render(<Calendar />);

    expect(await screen.findByRole('button', { name: /^Month$/i })).toHaveClass('view-mode-btn--active');
    expect(screen.getByRole('button', { name: /^Week$/i })).not.toHaveClass('view-mode-btn--active');
    expect(screen.getByRole('button', { name: /^Agenda$/i })).not.toHaveClass('view-mode-btn--active');
  });

  // TC-11 | FR-04 | Switches between Month, Week and Agenda views
  it('TC-11: switches between Month, Week and Agenda views, marking only the selected one active', async () => {
    startServer();
    render(<Calendar />);

    const monthBtn = await screen.findByRole('button', { name: /^Month$/i });
    const weekBtn = screen.getByRole('button', { name: /^Week$/i });
    const agendaBtn = screen.getByRole('button', { name: /^Agenda$/i });

    fireEvent.click(weekBtn);
    expect(weekBtn).toHaveClass('view-mode-btn--active');
    expect(monthBtn).not.toHaveClass('view-mode-btn--active');
    expect(document.querySelector('.week-grid')).not.toBeNull();

    fireEvent.click(agendaBtn);
    expect(agendaBtn).toHaveClass('view-mode-btn--active');
    expect(weekBtn).not.toHaveClass('view-mode-btn--active');
    expect(document.querySelector('.agenda-view')).not.toBeNull();
    expect(screen.getByText(/Mid-Project Report/i)).toBeInTheDocument();

    fireEvent.click(monthBtn);
    expect(monthBtn).toHaveClass('view-mode-btn--active');
    expect(document.querySelector('.month-grid')).not.toBeNull();
  });

  // TC-32 | FR-04 | Event data preserved when switching views
  it('TC-32: keeps event data when switching away from a view and back again', async () => {
    startServer();
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    expect(await screen.findByText(/Mid-Project Report/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^Month$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Agenda$/i }));

    expect(screen.getByText(/Mid-Project Report/i)).toBeInTheDocument();
    // Switching views is client-side only - no extra Canvas requests
    expect(server.callsTo('GET /canvas/assignments')).toHaveLength(1);
  });

  // TC-33 | FR-04 | Month view shows the event on its due date
  it('TC-33: shows the assignment inside its due-date cell in Month view', async () => {
    pinToday();
    startServer();
    render(<Calendar />);

    const pill = await screen.findByTitle(/Mid-Project Report/i);
    const cell = pill.closest('.month-cell');
    expect(cell).not.toBeNull();
    expect(cell).not.toHaveClass('month-cell--other-month');
    expect(within(cell).getByText('23')).toBeInTheDocument();
    expect(within(cell).getByText('1')).toHaveClass('month-cell__count');
  });

  // TC-34 | FR-04 | Week view shows the event in the displayed week
  it('TC-34: shows the assignment in Week view when its due date falls in the displayed week', async () => {
    pinToday();
    startServer();
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Week$/i }));

    const card = await screen.findByRole('button', { name: /Mid-Project Report/i });
    expect(card).toHaveClass('week-card');
    expect(within(card).getByText('100 pts')).toBeInTheDocument();
  });

  // TC-35 | FR-04 | Previous / next navigation moves the displayed period
  it('TC-35: moves to the previous and next month with the navigation buttons', async () => {
    pinToday();
    startServer();
    render(<Calendar />);

    expect(await screen.findByRole('heading', { name: /August 2026/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /next period/i }));
    expect(screen.getByRole('heading', { name: /September 2026/i })).toBeInTheDocument();
    expect(screen.queryByTitle(/Mid-Project Report/i)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /previous period/i }));
    fireEvent.click(screen.getByRole('button', { name: /previous period/i }));
    expect(screen.getByRole('heading', { name: /July 2026/i })).toBeInTheDocument();
  });

  // TC-12 | FR-04 | Opens assignment detail modal when clicked
  it('TC-12: opens the assignment detail modal with Canvas details when an event is clicked', async () => {
    startServer();
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    fireEvent.click(await screen.findByText(/Mid-Project Report/i));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('Software Quality Assurance 2026 S2')).toBeInTheDocument();
    expect(within(dialog).getByText(/100 pts/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('link', { name: /open in canvas/i })).toHaveAttribute(
      'href',
      'https://aut.instructure.com/courses/23616/assignments/195229'
    );

    fireEvent.click(within(dialog).getByRole('button', { name: /^Close$/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// FR-05 Custom events
// ---------------------------------------------------------------------------
describe('Calendar - custom events (FR-05)', () => {
  // TC-13 | FR-05 | User-input custom event shown on the calendar
  it('TC-13: shows a user-entered custom event on the calendar after the form is submitted', async () => {
    startServer({
      'POST /canvas/events': ({ body }) => ({ id: 8001, title: body.name, start_at: body.due_at }),
    });
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    await openAddEventAndSave('Custom Study Session', '2026-08-25');

    expect(await screen.findByText('Custom Study Session')).toBeInTheDocument();
    expect(screen.getAllByText('Personal Event').length).toBeGreaterThan(0);
  });

  // TC-14 | FR-05 | Custom event input is saved
  it('TC-14: saves the custom event to Canvas and caches it locally', async () => {
    startServer({
      'POST /canvas/events': ({ body }) => ({ id: 8002, title: body.name, start_at: body.due_at }),
    });
    render(<Calendar />);

    await openAddEventAndSave('Exam Revision', '2026-08-28');

    await waitFor(() => {
      expect(server.callsTo('POST /canvas/events')).toHaveLength(1);
    });
    expect(server.callsTo('POST /canvas/events')[0].body).toEqual(
      expect.objectContaining({ name: 'Exam Revision' })
    );
    await waitFor(() => {
      const cached = JSON.parse(localStorage.getItem('ams_custom_events'));
      expect(cached).toEqual([expect.objectContaining({ id: 8002, name: 'Exam Revision', isCustom: true })]);
    });
  });

  // TC-36 | FR-05 | Event still saved locally when Canvas is unavailable
  it('TC-36: falls back to saving the event locally when Canvas rejects the request', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    startServer({ 'POST /canvas/events': status(503, { message: 'Canvas unavailable' }) });
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    await openAddEventAndSave('Offline Study Block', '2026-08-29');

    expect(await screen.findByText('Offline Study Block')).toBeInTheDocument();
    const cached = JSON.parse(localStorage.getItem('ams_custom_events'));
    expect(cached).toHaveLength(1);
    expect(cached[0].id).toMatch(/^custom_/);
    expect(cached[0].name).toBe('Offline Study Block');
    warn.mockRestore();
  });

  // TC-37 | FR-05 | A custom event can be deleted
  it('TC-37: deletes a custom event from Canvas and removes it from the calendar', async () => {
    startServer({
      'GET /canvas/events': [
        { id: 8003, title: 'Tutor Meeting', start_at: '2026-08-26T10:00:00Z' },
      ],
      'DELETE /canvas/events/8003': {},
    });
    render(<Calendar />);

    fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
    fireEvent.click(await screen.findByText('Tutor Meeting'));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: /delete event/i }));

    await waitFor(() => {
      expect(screen.queryByText('Tutor Meeting')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(server.callsTo('DELETE /canvas/events/8003')).toHaveLength(1);
    });
  });
});

// ---------------------------------------------------------------------------
// NFR-03 Error handling
// ---------------------------------------------------------------------------
describe('Calendar - error handling (NFR-03)', () => {
  // TC-38 | NFR-03 | Calendar shows an error when Canvas assignments fail
  it('TC-38: shows an error alert instead of crashing when Canvas assignments cannot be loaded', async () => {
    startServer({ 'GET /canvas/assignments': networkError() });
    render(<Calendar />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn.t load calendar assignments/i);
    expect(screen.getByRole('heading', { name: /assignment calendar/i })).toBeInTheDocument();
  });
});

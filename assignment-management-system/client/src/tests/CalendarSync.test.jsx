// CalendarSync.test.jsx
// Requirements:
//   FR-02  Integrate with Canvas API to synchronise assignments and events
//          AC: imported data matches Canvas; API failures handled without crashing
//   FR-11  Synchronise data to keep information current with Canvas
//          AC: new Canvas data appears without creating duplicate entries
//   NFR-03 Canvas synchronisation handles failed requests appropriately
//
// Renders the real Calendar page. The real canvas service is used, including
// pruneStaleCanvasEvents / getCustomEvents and their localStorage cache
// ('ams_custom_events'). Only HTTP is faked.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Calendar from '../pages/Calendar';
import { mockServer, sequence, networkError } from './helpers/mockServer';

const COURSE = 'Software Quality Assurance 2026 S2';
const mockCoursesData = [
  {
    courseId: 23616,
    courseName: COURSE,
    assignments: [
      {
        id: 195229,
        name: 'Mid-Project Report',
        due_at: '2026-08-23T11:59:59Z',
        points_possible: 100,
      },
    ],
  },
];

const canvasEvent = (id, title, start_at) => ({ id, title, start_at, courseId: 23616, courseName: COURSE });

function seedCache(events) {
  localStorage.setItem('ams_custom_events', JSON.stringify(events));
}
function readCache() {
  return JSON.parse(localStorage.getItem('ams_custom_events') || '[]');
}

let server;
function startServer(eventsHandler) {
  server = mockServer({
    'GET /canvas/assignments': mockCoursesData,
    'GET /canvas/events': eventsHandler,
  });
}

async function openAgenda() {
  fireEvent.click(await screen.findByRole('button', { name: /^Agenda$/i }));
}

beforeEach(() => {
  localStorage.clear();
});
afterEach(() => {
  server?.restore();
});

describe('Calendar sync - Canvas integration (FR-02)', () => {
  // TC-04 | FR-02 | Refreshes Canvas calendar events when Sync is clicked
  it('TC-04: re-fetches Canvas events and assignments when Sync is clicked', async () => {
    startServer(sequence([], [canvasEvent(7002, 'New Canvas Deadline', '2026-08-27T23:59:00Z')]));
    render(<Calendar />);

    await openAgenda();
    expect(screen.queryByText('New Canvas Deadline')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sync/i }));

    expect(await screen.findByText('New Canvas Deadline')).toBeInTheDocument();
    expect(server.callsTo('GET /canvas/events')).toHaveLength(2);
    expect(server.callsTo('GET /canvas/assignments')).toHaveLength(2);
  });
});

describe('Calendar sync - keeping data current (FR-11)', () => {
  // TC-20 | FR-11 | Synchronises live Canvas events and prunes stale cached events
  it('TC-20: merges live Canvas events and prunes stale Canvas events from the local cache', async () => {
    seedCache([
      { id: 5555, name: 'Old Cached Canvas Event', due_at: '2026-08-01T09:00:00Z', isCustom: true },
      { id: 7001, name: 'Canvas Lecture', due_at: '2026-08-26T09:00:00Z', isCustom: true },
    ]);
    startServer([canvasEvent(7001, 'Canvas Lecture', '2026-08-26T09:00:00Z')]);
    render(<Calendar />);

    await openAgenda();
    expect(await screen.findByText('Canvas Lecture')).toBeInTheDocument();
    expect(screen.getByText('Mid-Project Report')).toBeInTheDocument();
    expect(screen.queryByText('Old Cached Canvas Event')).not.toBeInTheDocument();
    expect(readCache().map((e) => e.id)).toEqual([7001]);
  });

  // TC-39 | FR-11 | Re-syncing the same event does not duplicate it
  it('TC-39: does not render a duplicate when a manual sync returns the same event again', async () => {
    const event = canvasEvent(7001, 'Canvas Lecture', '2026-08-26T09:00:00Z');
    startServer(sequence([event], [event]));
    render(<Calendar />);

    await openAgenda();
    await screen.findByText('Canvas Lecture');

    fireEvent.click(screen.getByRole('button', { name: /sync/i }));
    await waitFor(() => expect(server.callsTo('GET /canvas/events')).toHaveLength(2));

    expect(screen.getAllByText('Canvas Lecture')).toHaveLength(1);
  });

  // TC-40 | FR-11 | Cached copy + Canvas copy of the same event shown once
  it('TC-40: shows one entry when an event exists both in the local cache and in Canvas', async () => {
    seedCache([{ id: 7002, name: 'Group Meeting', due_at: '2026-08-27T10:00:00Z', isCustom: true }]);
    startServer([canvasEvent(7002, 'Group Meeting', '2026-08-27T10:00:00Z')]);
    render(<Calendar />);

    await openAgenda();
    await screen.findByText('Group Meeting');
    expect(screen.getAllByText('Group Meeting')).toHaveLength(1);
  });

  // TC-41 | FR-11 | Mixed new and repeated data across syncs
  it('TC-41: shows exactly one entry per unique event across syncs with new and repeated data', async () => {
    const existing = canvasEvent(7001, 'Canvas Lecture', '2026-08-26T09:00:00Z');
    const added = canvasEvent(7003, 'New Canvas Deadline', '2026-08-27T23:59:00Z');
    startServer(sequence([existing], [existing, added]));
    render(<Calendar />);

    await openAgenda();
    await screen.findByText('Canvas Lecture');

    fireEvent.click(screen.getByRole('button', { name: /sync/i }));

    expect(await screen.findByText('New Canvas Deadline')).toBeInTheDocument();
    expect(screen.getAllByText('Canvas Lecture')).toHaveLength(1);
    expect(screen.getAllByText('New Canvas Deadline')).toHaveLength(1);
  });

  // TC-42 | FR-11 | Events removed in Canvas are removed locally
  it('TC-42: removes an event from the calendar once Canvas no longer returns it', async () => {
    startServer(sequence([canvasEvent(9001, 'Cancelled Lecture', '2026-08-20T09:00:00Z')], []));
    render(<Calendar />);

    await openAgenda();
    await screen.findByText('Cancelled Lecture');

    fireEvent.click(screen.getByRole('button', { name: /sync/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cancelled Lecture')).not.toBeInTheDocument();
    });
  });

  // TC-43 | FR-11 | Offline custom drafts survive pruning
  it('TC-43: keeps an offline custom event while pruning a stale Canvas event', async () => {
    seedCache([
      { id: 'custom_1', name: 'My Study Session', due_at: '2026-08-21T10:00:00Z', isCustom: true },
      { id: 9001, name: 'Cancelled Lecture', due_at: '2026-08-20T09:00:00Z', isCustom: true },
    ]);
    startServer(sequence([canvasEvent(9001, 'Cancelled Lecture', '2026-08-20T09:00:00Z')], []));
    render(<Calendar />);

    await openAgenda();
    await screen.findByText('Cancelled Lecture');
    expect(screen.getByText('My Study Session')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /sync/i }));

    await waitFor(() => {
      expect(screen.queryByText('Cancelled Lecture')).not.toBeInTheDocument();
    });
    expect(screen.getByText('My Study Session')).toBeInTheDocument();
    expect(readCache().map((e) => e.id)).toEqual(['custom_1']);
  });
});

describe('Calendar sync - failure handling (NFR-03)', () => {
  // TC-44 | NFR-03 | Falls back to cached events when Canvas events fail
  it('TC-44: shows cached events and assignments when the Canvas events request fails', async () => {
    seedCache([{ id: 'custom_2', name: 'Cached Personal Event', due_at: '2026-08-22T10:00:00Z', isCustom: true }]);
    startServer(networkError());
    render(<Calendar />);

    await openAgenda();
    expect(await screen.findByText('Cached Personal Event')).toBeInTheDocument();
    expect(screen.getByText('Mid-Project Report')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});

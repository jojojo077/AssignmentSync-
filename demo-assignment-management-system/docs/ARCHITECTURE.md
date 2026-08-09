# Architecture & Requirements Traceability

This maps the Functional and Non-Functional Requirements from the mid-project report to
where they live (or will live) in the codebase. Useful as a starting point for the
requirements-traceability section of the final report.

## Functional Requirements → Implementation

| Requirement | Where |
|---|---|
| Secure user authentication and profile management | `server/src/routes/auth.routes.js`, `auth.controller.js` (stubbed), `client/src/context/AuthContext.jsx` |
| Canvas API integration (assignments, deadlines, announcements, calendar) | `server/src/services/canvasService.js`, `server/src/routes/canvas.routes.js` |
| Dashboard: upcoming assessments, announcements, workload, progress | `client/src/pages/Dashboard.jsx` |
| Interactive calendar (daily/weekly/monthly) | `client/src/pages/Calendar.jsx` (placeholder — not built) |
| Automatic workload calculation | Not started — planned as a pure function in `server/src/services/workloadService.js` |
| Search / filter / sort assignments | `client/src/pages/Assignments.jsx` (placeholder — not built) |
| Progress tracking (completion %) | Not started — needs a data store, since Canvas doesn't track this |
| Browser/email notifications with configurable intervals | Not started |
| Reporting & analytics (workload trends, overdue, progress) | Not started |
| Data synchronisation with Canvas | `canvasService.js` fetches live on request; no caching/sync job yet |

## Non-Functional Requirements → How the scaffold addresses them

| Requirement | Approach |
|---|---|
| **Usability** | Single nav shell (`Navbar.jsx`), consistent route structure. Needs a real design pass (see `frontend-design` conventions) once features are built out. |
| **Performance** (dashboard loads <2s) | Backend Canvas calls run in parallel via `Promise.all` in `getAllUpcomingAssignments`, rather than sequential per-course requests. Worth load-testing once real data volumes are known. |
| **Reliability** (99% Canvas sync success) | Per-course fetch failures are caught individually (`.catch(() => [])`) so one bad course doesn't fail the whole dashboard. Centralised `errorHandler` middleware standardises error responses for retry logic client-side. |
| **Security** | `helmet` middleware for HTTP headers, CORS locked to the client origin, `.env`-based secrets (never committed — see `.gitignore`). JWT auth planned but not yet implemented — **do not treat current auth as secure**. |
| **Maintainability** | Layered structure (routes → controllers → services) so Canvas API logic, HTTP handling, and business logic stay separated. Single `config/env.js` as the only place reading `process.env`. |
| **Accessibility** | Semantic HTML in page components (`<nav>`, `<main>`, proper `<label htmlFor>` on the login form). Needs a proper WCAG 2.1 AA audit once UI is fleshed out. |
| **Compatibility** | Vite/React targets evergreen browsers by default; no compatibility testing done yet. |
| **Scalability** | Stateless Express API (no in-memory session state) — horizontally scalable once a real database replaces any future in-memory stubs. |

## Testing approach so far

- **Server:** Jest + Supertest, testing at the HTTP layer against the Express `app` instance
  directly (no real network port), so tests are fast and isolated. `tests/health.test.js`
  covers a happy path and a 404 path.
- **Client:** Vitest + React Testing Library, rendering the full `<App />` through the real
  router to catch integration issues (e.g. broken nav links), not just isolated components.
- **CI:** both suites run automatically via GitHub Actions on every push/PR to `main`/`develop`.

Not yet covered: Canvas service unit tests (would need mocking `axios`), any auth flow tests
(auth isn't implemented yet), and end-to-end/UI tests.

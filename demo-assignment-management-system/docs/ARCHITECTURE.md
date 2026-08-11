# Architecture & Requirements Traceability

This maps the Functional and Non-Functional Requirements from the mid-project report to
where they live (or will live) in the codebase. Useful as a starting point for the
requirements-traceability section of the final report.

## Functional Requirements → Implementation

| Requirement | Where |
|---|---|
| Secure user authentication and profile management | `server/Controllers/AuthController.cs` (stubbed), `client/src/context/AuthContext.jsx` |
| Canvas API integration (assignments, deadlines, announcements, calendar) | `server/Services/CanvasService.cs`, `server/Controllers/CanvasController.cs` |
| Dashboard: upcoming assessments, announcements, workload, progress | `client/src/pages/Dashboard.jsx` |
| Interactive calendar (daily/weekly/monthly) | `client/src/pages/Calendar.jsx` (placeholder — not built) |
| Automatic workload calculation | Not started — planned as a small class in `server/Services/WorkloadService.cs` |
| Search / filter / sort assignments | `client/src/pages/Assignments.jsx` (placeholder — not built) |
| Progress tracking (completion %) | Not started — needs a data store, since Canvas doesn't track this |
| Browser/email notifications with configurable intervals | Not started |
| Reporting & analytics (workload trends, overdue, progress) | Not started |
| Data synchronisation with Canvas | `CanvasService.cs` fetches live on request; no caching/sync job yet |

## Non-Functional Requirements → How the scaffold addresses them

| Requirement | Approach |
|---|---|
| **Usability** | Single nav shell (`Navbar.jsx`), consistent route structure. Needs a real design pass (see `frontend-design` conventions) once features are built out. |
| **Performance** (dashboard loads <2s) | Backend Canvas calls run in parallel via `Promise.all` in `getAllUpcomingAssignments`, rather than sequential per-course requests. Worth load-testing once real data volumes are known. |
| **Reliability** (99% Canvas sync success) | Per-course fetch failures are caught individually in `GetAllUpcomingAssignmentsAsync` so one bad course doesn't fail the whole dashboard. Centralised `ExceptionHandlingMiddleware` standardises error responses for retry logic client-side. |
| **Security** | CORS locked to the client origin. Secrets kept out of `appsettings.json` via .NET user-secrets (see README) — never committed, unlike a plain `.env`-in-git mistake. JWT auth planned but not yet implemented — **do not treat current auth as secure**. |
| **Maintainability** | Layered structure (Controllers → Services) so Canvas API logic and HTTP handling stay separated. Strongly-typed `IOptions<CanvasOptions>`/`IOptions<JwtOptions>` instead of scattered config reads. |
| **Accessibility** | Semantic HTML in page components (`<nav>`, `<main>`, proper `<label htmlFor>` on the login form). Needs a proper WCAG 2.1 AA audit once UI is fleshed out. |
| **Compatibility** | Vite/React targets evergreen browsers by default; no compatibility testing done yet. |
| **Scalability** | Stateless Express API (no in-memory session state) — horizontally scalable once a real database replaces any future in-memory stubs. |

## Testing approach so far

- **Server:** xUnit + `WebApplicationFactory<Program>`, testing at the HTTP layer against the
  real app pipeline in-memory (no real network port), so tests are fast and isolated.
  `server.Tests/HealthControllerTests.cs`, `CanvasControllerTests.cs`, and
  `AuthControllerTests.cs` cover the happy path, the 404 path, the auth-guard 401, the
  config-missing 500, and model-validation 400.
- **Client:** Vitest + React Testing Library, rendering the full `<App />` through the real
  router to catch integration issues (e.g. broken nav links), not just isolated components.
- **CI:** both suites run automatically via GitHub Actions on every push/PR to `main`/`develop`.

Not yet covered: `CanvasService` unit tests in isolation (would need mocking `HttpClient` via
`HttpMessageHandler`), any real auth flow tests (auth isn't implemented yet), and
end-to-end/UI tests.

# Assignment Management System

A responsive web app that pulls assignments, deadlines, and announcements from Canvas LMS
into a single dashboard with workload calculation, an integrated calendar, and reminders —
built for the SQA mid-project (see `SQA_Mid-Project_Report.docx` for the full requirements).

## Stack

- **Client:** React 19 + Vite, React Router, Axios
- **Server:** Node.js + Express, Axios (Canvas API client)
- **Testing:** Jest + Supertest (server), Vitest + React Testing Library (client)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs both test suites on every push/PR

## Project structure

```
assignment-management-system/
├── client/                 React frontend (Vite)
│   └── src/
│       ├── pages/          Dashboard, Calendar, Assignments, Login, NotFound
│       ├── components/     Layout, Navbar
│       ├── context/        AuthContext (login state)
│       ├── services/       api.js — all backend calls live here
│       └── router.jsx      route table
├── server/                 Express API
│   └── src/
│       ├── routes/         /api/health, /api/auth, /api/canvas
│       ├── controllers/    request handlers
│       ├── services/       canvasService.js — Canvas REST API wrapper
│       ├── middleware/     error handling, auth guard
│       └── config/         env.js — single source of truth for env vars
└── docs/
    └── ARCHITECTURE.md     requirements → implementation traceability
```

## Getting started

You need Node 18+ installed.

### 1. Server

```bash
cd server
cp .env.example .env      # fill in CANVAS_BASE_URL and CANVAS_ACCESS_TOKEN
npm install
npm run dev                # http://localhost:5000
```

To get a Canvas access token for local testing: Canvas → Account → Settings → **New Access
Token**. `CANVAS_BASE_URL` is your institution's Canvas instance, e.g. `https://aut.instructure.com`.

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

### 3. Run the tests

```bash
cd server && npm test      # Jest + Supertest
cd client && npm test      # Vitest + React Testing Library
```

Both suites are already green on this scaffold (2 server tests, 1 client test) — they're
there as a starting point to build real coverage against as features land.

## What's implemented vs. stubbed

| Area | Status |
|---|---|
| Express app, error handling, CORS, health check | ✅ working |
| Canvas API service (`getCourses`, `getAssignmentsForCourse`, `getAllUpcomingAssignments`) | ✅ working, needs a real Canvas token to hit |
| Dashboard page fetching `/api/canvas/assignments` | ✅ working |
| React Router shell, nav, page skeletons (Calendar, Assignments, Login) | ✅ working, UI is unstyled placeholder |
| Auth (register/login) | 🚧 stubbed — routes exist, return `501`, no password hashing or JWT signing yet |
| Workload calculation, notifications, reporting/analytics | ⬜ not started |
| Progress tracking (completion %) | ⬜ not started |

## A note on dependency versions

`client/package.json` pins `vite@^7.0.0` and `@vitejs/plugin-react@^5.2.0` on purpose —
the freshly-scaffolded `vite@8` + `vitest@2` combination has a peer dependency mismatch
(vitest 2.x bundles vite 5 internally) that breaks the JSX transform in tests. Vitest 5
(currently in beta) is expected to fix this properly; until it's stable, this pin is the
simplest reliable setup. Worth a line in the report's "limitations/risks" section if you
want a real example of a dependency-management issue you hit and resolved.

## Suggested next steps

1. Wire up real auth: password hashing (`bcrypt`) + JWT signing in `auth.controller.js`, then
   flip `login()` in `AuthContext` to actually store a real token.
2. Add a `ProtectedRoute` wrapper in the client so `/`, `/calendar`, `/assignments` require login.
3. Build the workload calculation (distribute estimated hours across days before each due date)
   as a small pure function in `server/src/services/` — easy to unit test in isolation.
4. Pick a data store (Postgres/Mongo) for users + local assignment metadata (completion %,
   priority) that Canvas doesn't track — Canvas is a read-only source of truth for deadlines.

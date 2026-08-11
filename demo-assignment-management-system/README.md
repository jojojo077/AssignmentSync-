# Assignment Management System

A responsive web app that pulls assignments, deadlines, and announcements from Canvas LMS
into a single dashboard with workload calculation, an integrated calendar, and reminders —
built for the SQA mid-project (see `SQA_Mid-Project_Report.docx` for the full requirements).

## Stack

- **Client:** React 19 + Vite, React Router, Axios
- **Server:** ASP.NET Core 8 Web API (C#), Controllers-based, `HttpClient` (Canvas API client)
- **Testing:** xUnit + `WebApplicationFactory` (server), Vitest + React Testing Library (client)
- **CI:** GitHub Actions (`.github/workflows/ci.yml`) runs both test suites on every push/PR

## Project structure

```
assignment-management-system/
├── AssignmentManagementSystem.sln   solution file — open this in Rider/VS/VS Code
├── client/                 React frontend (Vite)
│   └── src/
│       ├── pages/          Dashboard, Calendar, Assignments, Login, NotFound
│       ├── components/     Layout, Navbar
│       ├── context/        AuthContext (login state)
│       ├── services/       api.js — all backend calls live here
│       └── router.jsx      route table
├── server/                 ASP.NET Core Web API
│   ├── Controllers/        HealthController, AuthController, CanvasController
│   ├── Services/           ICanvasService / CanvasService — Canvas REST API wrapper
│   ├── Middleware/         ExceptionHandlingMiddleware, RequireAuthAttribute, ApiException
│   ├── Config/              CanvasOptions, JwtOptions (bound from appsettings.json)
│   ├── Models/              DTOs (Canvas courses/assignments, auth requests)
│   ├── Program.cs           service registration + middleware pipeline
│   └── appsettings.json     committed config, placeholder values only
├── server.Tests/           xUnit integration tests (WebApplicationFactory<Program>)
└── docs/
    └── ARCHITECTURE.md     requirements → implementation traceability
```

## Getting started

You need the **.NET 8 SDK** and **Node 18+** installed.

### 1. Server (ASP.NET Core)

```bash
cd server
dotnet restore
dotnet run                 # http://localhost:5000 (port is fixed in Properties/launchSettings.json)
```

Canvas isn't configured by default — `GET /api/canvas/*` will return a clean `500` explaining
what's missing until you set it. **Don't put real secrets in `appsettings.json`** (it's
committed to git) — use .NET's user-secrets instead, which stores them outside the repo:

```bash
cd server
dotnet user-secrets init
dotnet user-secrets set "Canvas:BaseUrl" "https://aut.instructure.com"
dotnet user-secrets set "Canvas:AccessToken" "your-canvas-personal-access-token"
```

Get a token from Canvas → Account → Settings → **New Access Token**.

### 2. Client

```bash
cd client
cp .env.example .env
npm install
npm run dev                # http://localhost:5173
```

No changes needed on the client side — the route surface is identical (`/api/health`,
`/api/auth/*`, `/api/canvas/*`), so `client/src/services/api.js` talks to the C# backend
exactly like it did the old one.

### 3. Run the tests

```bash
dotnet test                # from repo root — runs server.Tests via the .sln
cd client && npm test       # Vitest + React Testing Library
```

## What's implemented vs. stubbed

| Area | Status |
|---|---|
| ASP.NET Core app, exception middleware, CORS, health check | ✅ working |
| Canvas API service (`GetCoursesAsync`, `GetAssignmentsForCourseAsync`, `GetAllUpcomingAssignmentsAsync`) | ✅ working, needs a real Canvas token to hit |
| Dashboard page fetching `/api/canvas/assignments` | ✅ working, UI is unstyled placeholder |
| React Router shell, nav, page skeletons (Calendar, Assignments, Login) | ✅ working |
| Auth (register/login) | 🚧 stubbed — endpoints exist, return `501`, no password hashing or JWT signing yet |
| Workload calculation, notifications, reporting/analytics | ⬜ not started |
| Progress tracking (completion %) | ⬜ not started |

## A note on how this was verified

The ASP.NET Core project (`server/`) was built and run end-to-end in the environment that
produced this scaffold, hitting every endpoint live: `/api/health` (200), `/api/canvas/courses`
without a token (401), with a token but no Canvas config (500 with a clear message), CORS
preflight from the client origin, and `/api/auth/login` (501). All matched expectations.

**One caveat:** that environment can't reach `nuget.org`, so while the API itself (which uses
zero external NuGet packages — everything comes from the ASP.NET Core shared framework) was
fully build- and run-verified, the `server.Tests` project (which needs `xunit`,
`Microsoft.NET.Test.Sdk`, and `Microsoft.AspNetCore.Mvc.Testing` from NuGet) could not be
restored or run there. The test code follows completely standard `WebApplicationFactory` +
xUnit patterns and asserts exactly the behaviour verified above, but **run `dotnet test`
yourself as your first step** rather than assuming it's proven — that's honest, not a formality.

## Suggested next steps

1. Wire up real auth: add `BCrypt.Net-Next` for password hashing and
   `Microsoft.AspNetCore.Authentication.JwtBearer` for JWT issuing/validation in
   `AuthController`, then flip `RequireAuthAttribute` for a standard `[Authorize]`.
2. Add a `ProtectedRoute` wrapper in the client so `/`, `/calendar`, `/assignments` require login.
3. Build the workload calculation (distribute estimated hours across days before each due date)
   as a small, easily-unit-tested class in `server/Services/`.
4. Pick a data store (EF Core + SQL Server/PostgreSQL/SQLite) for users + local assignment
   metadata (completion %, priority) that Canvas doesn't track — Canvas stays a read-only
   source of truth for deadlines.

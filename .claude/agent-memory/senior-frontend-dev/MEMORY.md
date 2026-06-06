# Frontend Development Memory

## Project Structure

### Key Locations

- **New Frontend**: `packages/webapp/` — htmx-based, active development ← **use this**
- **[DEPRECATED] Old Frontend**: `packages/client/` — React 19 SPA with MUI (do not add features)
- **Backend**: `packages/server/` - Bun HTTP server with type-safe routing
- **Shared Types**: `packages/shared/typings/SQLModel/` - Database table TypeScript types
- **SQL Queries**: `packages/server/database/queries/*.sql` - Named SQL query files

### HTMX v4 Reference → [[htmx-patterns]]

See `htmx-patterns.md` for attributes, swap strategies, security rules, server headers, and the navigation pattern used in `packages/webapp/index.html`.

### Database Query Pattern — Analytics Repository

1. Create SQL file in `packages/server/database/queries/QUERY_NAME.sql`
2. Import the SQL file directly at the top of `analytics-repository.ts` (e.g., `import attendancePersonHistory from "../queries/ATTENDANCE_PERSON_HISTORY.sql"`)
3. Add method to `AnalyticsRepository` class in `packages/server/database/repositories/analytics-repository.ts`
4. Add route to `packages/server/routes/insight-analytics-routes.ts` (auto-registered via spread in `index.ts`)

Note: The `analytics-repository.ts` uses direct SQL file imports (not `readFileSync`). The routes file auto-registers — no need to update `index.ts`.

### RollCall Tables

- `RollCallReport`: `id`, `session_date` — one row per nimenhuuto session
- `RollCallEntry`: `roll_call_id`, `person_id`, `entry_type` (`'absent'` or `'late'`), `absence_reason`, `party`
- LEFT JOIN `RollCallReport` → `RollCallEntry`: NULL `entry_type` means the person was present (no entry recorded)

### API Patterns

- Use `BunRequest<"/path/:param">` for typed route parameters
- Fetch methods return data directly, API routes wrap in Response with JSON
- Parameterized fetch: `apiFetch(\`/api/path/${id}\`)` — template literals work fine, type inferred
- `ApiRouteItem<"/api/path/:param">` extracts the array item type for parameterized routes

## Security Middleware (packages/server/middleware/)

### `security-headers.ts`

- Exports `withSecurityHeaders(routes)` — wraps an entire route map to inject security headers on every response
- Exports `addSecurityHeaders(response)` — wraps a single `Response`
- Used in `index.ts`: `withSecurityHeaders({ ...staticRoutes, ...apiRoutes, "/api/*": fallback })`
- Also called in the Bun `error()` handler for 500 responses
- Type uses `any` for route handlers to accommodate Bun's varied handler signatures (sync, typed, HTMLBundle)

### `rate-limiter.ts`

- Exports `createRateLimiter({ maxRequests, windowMs })` returning `{ wrap(handler) }`
- In-memory sliding window per client IP (x-forwarded-for → x-real-ip → "unknown")
- Applied to: `/api/search` (30 req/60s), `/api/person/search` (30 req/60s), `/api/votings/search` (30 req/60s)

## Route Validation Patterns (packages/server/routes/http.ts)

### `validateDateRange`

- Validates `startDate` / `endDate` query params against `YYYY-MM-DD` regex
- Returns `Response | null`; call before building params and early-return if non-null
- Applied to: interpellations, government-proposals, committee-reports, legislative-initiatives, written-questions, expert-statements, written-question-responses, oral-questions

### Identifier route params

- Pattern: `const identifier = decodeURIComponent(req.params.identifier).trim(); if (!identifier) return badRequest("Missing document identifier");`
- Applied to all `by-identifier/:identifier` endpoints


## Server Route Structure

Routes live in `packages/server/routes/documents/` split by domain:

- `question-family-routes.ts` - written questions, expert statements, oral questions
- `interpellation-government-routes.ts` - interpellations, government proposals
- `committee-legislative-routes.ts` - committee reports, legislative initiatives
- `document-routes.ts` - combines all routes + defines `DocumentRoutesDataAccess` interface (must be updated when adding new repo methods)

## Database Tables

### Voting

- Fields: id, number, title, n_yes, n_no, n_abstain, n_absent, n_total
- Foreign keys: section_key, session_key
- Result determined by: `n_yes > n_no`

### Section

- Fields: id, key, identifier, title, processing_title, resolution, ordinal
- Foreign keys: session_key, agenda_key

### Speech

- Joins with ExcelSpeech for content
- Fields: ordinal, person info, party, speech type
- Foreign key: section_key

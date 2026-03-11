# Project Issues

Issues are grouped by context to make batched work easier. Numbers are preserved from original tracking for reference.

---

## Group A — Security

Direct production security impact. Address before significant user traffic.

### 2. Stop exposing internal error details in HTTP 500 responses

- Severity: High *(was Medium)*
- Type: Bug
- Reference: `packages/server/index.ts`

Problem:
The global error handler returns `Internal Error: ${error.message}` to clients (line 205), and the JSON error body includes `details: error.message` (line 122).

Risk:
Leaks SQL errors, file paths, and other operational internals to any caller.

Acceptance Criteria:
- Return a generic `Internal Server Error` body for all 5xx responses.
- Keep detailed error information in server logs only.
- Review all error-handling paths for similar leakage.
- Add a test asserting internal exception messages are not returned to clients.

---

### 15. Add HTTP security response headers

- Severity: Medium
- Type: Bug
- Reference: `packages/server/index.ts`

Problem:
The server emits no `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy`, or `Referrer-Policy` headers. Browsers are left without standard defences against MIME sniffing, clickjacking, and data leakage.

Acceptance Criteria:
- Emit `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, and a restrictive `Content-Security-Policy` on all responses.
- Apply headers in a single central location (middleware or wrapper) rather than per-route.
- Add a test asserting the headers are present on at least one representative endpoint.

---

### 1. Constrain local storage keys to the configured base directory

- Severity: Medium *(was Low)*
- Type: Bug
- Reference: `packages/shared/storage/providers/local.ts`

Problem:
`LocalStorageProvider` maps storage keys with `path.join(this.baseDir, key)` and does not verify that the resolved path stays inside `baseDir`.

Risk:
Malformed or unexpected keys (e.g. `../../etc/passwd`) can escape the storage root and read or overwrite arbitrary files accessible to the process.

Acceptance Criteria:
- Normalize and resolve the target path before use.
- Reject keys whose resolved path is outside `baseDir`.
- Apply the same check to `put`, `putFile`, `getFile`, `get`, `exists`, `delete`, and `metadata`.
- Add tests for `..` segments and absolute-path inputs.

---

### 17. Standardise route parameter validation

- Severity: Medium *(was Low)*
- Type: Bug
- References: `packages/server/routes/documents/interpellation-government-routes.ts`, `packages/server/routes/documents/committee-legislative-routes.ts`, `packages/server/routes/documents/question-family-routes.ts`

Problem:
Path parameters are decoded with `decodeURIComponent()` but most routes do not validate the result is non-empty or apply `.trim()`. Only some routes (e.g. `voting-routes.ts`) perform this check. Date query parameters are validated inconsistently — only `government-routes.ts` rejects non-ISO dates. Empty or malformed inputs can cause unhandled exceptions and 500 responses.

Acceptance Criteria:
- Apply `.trim()` and an empty-string check consistently after every `decodeURIComponent()` call, returning `400 Bad Request` for empty values.
- Add ISO 8601 format validation for all `startDate`/`endDate` query parameters across all routes.
- Ensure coverage in existing or new tests.

---

### 14. Add rate limiting on expensive search endpoints

- Severity: Medium
- Type: Bug
- References: `packages/server/routes/documents/`, `packages/server/routes/person-routes.ts`, `packages/server/routes/voting-routes.ts`

Problem:
Full-text search endpoints (FTS queries) have no per-IP or per-endpoint rate limiting. A single client can saturate the server with repeated search queries.

Acceptance Criteria:
- Add rate limiting middleware or per-handler throttle for `/api/search`, `/api/person/search`, `/api/votings/search`, and any other FTS-backed endpoints.
- Return 429 with a `Retry-After` header when the limit is exceeded.
- Add a test asserting the 429 response is returned after the threshold.

---

## Group B — Correctness & Reliability

Backend and frontend bugs that affect production behavior or user-visible stability.

### 16. Fix N+1 query pattern in session day route

- Severity: Medium
- Type: Bug
- Reference: `packages/server/routes/session-routes.ts` (lines 91–111)

Problem:
The `/api/day/:date/sessions` route maps over each returned session and fires two individual queries per session (documents + notices), producing O(n) round-trips.

Acceptance Criteria:
- Replace per-session queries with batch queries that accept all session keys in a single call, matching the pattern already used in `attachSectionsAndVotingCounts()` in `session-repository.ts`.
- Add a test or assertion verifying only a constant number of queries are executed regardless of session count.

---

### 3. Evict expired cache entries before enforcing response-cache capacity

- Severity: Medium
- Type: Bug
- Reference: `packages/server/cache/response-cache.ts`

Problem:
`createResponseCache()` stops inserting new entries once `store.size >= maxEntries`, but expired entries are only removed on lookup. The cache can become permanently saturated for unseen routes and stop caching new responses even after TTL expiry.

Acceptance Criteria:
- Purge expired entries before checking `maxEntries`.
- Add a test covering recovery after TTL expiry when capacity was previously full.
- Preserve current behavior of not caching 5xx responses.

---

### 19. Fix silent error swallowing in client API fetch calls

- Severity: Medium
- Type: Bug
- References: `packages/client/app.tsx` (lines 42–66), `packages/client/components/DocumentCards.tsx`, `packages/client/pages/Documents/index.tsx`, `packages/client/pages/Composition/index.tsx`, `packages/client/pages/Composition/Details.tsx`, `packages/client/pages/Parties/PartyDetail.tsx`

Problem:
Numerous fetch chains use `.catch(() => {})`, discarding errors silently. Users receive no feedback when metadata, document subjects, card details, or composition data fails to load. The pattern is widespread: at least 10 silent catch sites across app-level and page-level fetches. Where error strings do appear in some pages, they are hardcoded English rather than i18n keys.

Acceptance Criteria:
- Replace silent catches with at minimum a `console.warn` in development and a visible fallback/error message for user-facing data fetches.
- All user-facing error strings must use i18n keys from `fi.json`, not hardcoded English literals.
- Apply a consistent error-state pattern across all pages that fetch data.

---

### 20. Add AbortController cleanup to fetch effects

- Severity: Low
- Type: Bug
- References: `packages/client/app.tsx`, `packages/client/pages/Documents/index.tsx` (subjects fetch), `packages/client/pages/Composition/index.tsx`

Problem:
Several `useEffect` fetch calls lack an `AbortController`. When the component unmounts or the effect re-runs before a previous fetch completes, the stale response updates state on an unmounted component. The correct pattern is already used in `VoteResults.tsx` and `Composition/Details.tsx`.

Acceptance Criteria:
- Add `AbortController` + `signal` to all fire-and-forget fetch effects, returning the `abort()` call from the cleanup function.
- Apply to every `useEffect` that initiates a fetch, including the app-level metadata fetches in `app.tsx`.

---

### 21. Fix query parameter inheritance when navigating between pages

- Severity: Low
- Type: Bug
- Reference: `packages/client/Navigation.tsx` (lines 90–95)

Problem:
The `navigate()` function preserves `window.location.search` when switching top-level tabs. Users who had Document filters active (`?type=HE&year=2023`) carry those parameters into Parties or Sessions, where they are meaningless or could be misinterpreted by a future page.

Acceptance Criteria:
- Drop the query string when navigating to a different top-level route, unless the destination page explicitly opts in to inheriting params.
- Verify that direct deep-link URLs for each page still function independently.

---

## Group C — Test Coverage

The test suite is currently not fully green (#5). Fix this group early — it underpins safe delivery of all other changes.

### 5. Restore test suite alignment with the current repository structure

- Severity: High
- Type: Maintenance
- References: `packages/datapipe/__tests__/migrator-sql-patterns.test.ts`, `packages/datapipe/__tests__/migrations-schema.test.ts`

Problem:
Parts of the test suite still reference removed or moved Vaski migrator paths and outdated migration file expectations. `bun test` is not green, which reduces trust in CI failures and makes real regressions harder to distinguish from stale test debt.

Acceptance Criteria:
- Update or remove stale file-path assertions that no longer match the current migrator layout.
- Update expected active migration file lists to match the current schema history.
- Ensure the touched suites pass against the current repository structure.

---

### 6. Make SQL query smoke tests reflect the live schema

- Severity: Medium
- Type: Bug
- Reference: `packages/server/__tests__/all-sql-queries.test.ts`

Problem:
The SQL smoke test executes all query files against a seeded database that does not include every table referenced by the live query set, including `ImportSourceReference`. The suite produces false negatives and stops serving as a reliable guard for query compilation and binding regressions.

Acceptance Criteria:
- Seed the missing schema/tables required by the smoke test, or scope the test to the schema it provisions.
- Preserve the guarantee that every SQL file is non-empty and executable with representative default bindings.
- Ensure the suite passes without masking genuine SQL errors.

---

### 18. Expand backend test coverage for untested route groups

- Severity: Medium
- Type: Maintenance
- References: `packages/server/__tests__/`, `packages/server/routes/documents/`, `packages/server/routes/session-routes.ts`, `packages/server/routes/government-routes.ts`, `packages/server/routes/party-routes.ts`

Problem:
Several route families have no test files: all document routes (interpellations, government proposals, committee reports, questions, parliament answers), session routes, government routes, and party routes. The N+1 session query and identifier validation bugs above are undetectable without tests.

Acceptance Criteria:
- Add at minimum smoke-level tests for each untested route group verifying correct HTTP status, response shape, and error handling for invalid inputs.
- Cover boundary conditions: empty identifier, malformed date, out-of-range pagination.

---

## Group D — Accessibility & UX Polish

### 22. Resolve accessibility gaps across interactive components

- Severity: Medium
- Type: Bug
- References: `packages/client/pages/` (multiple), `packages/client/components/`

Problem:
Icon-only buttons throughout the app lack `aria-label`; data tables lack descriptive `aria-label` attributes. While `Navigation.tsx` provides `aria-label`/`aria-haspopup` on some controls, the pattern is not consistently applied across pages.

Acceptance Criteria:
- Add `aria-label` to all icon-only buttons and disclosure widgets across all pages.
- Add `aria-label` describing the purpose of all data tables.
- Verify keyboard navigability of all interactive controls (tabs, filters, expandable cards).
- A Lighthouse accessibility score of ≥ 90 on the main pages serves as the target benchmark.

---

## Group E — Architecture & Technical Debt

These issues do not affect immediate functionality but will slow future development if left unaddressed.

### 8. Replace ad hoc client-side routing and URL state plumbing

- Severity: Low *(was Medium)*
- Type: Maintenance
- References: `packages/client/app.tsx`, `packages/client/Navigation.tsx`, `packages/client/filters/HallituskausiContext.tsx`, `packages/client/pages/Insights/index.tsx`

Problem:
Navigation, route matching, and shareable URL state are managed manually across multiple components and contexts. Duplicated `popstate`, URL parsing, and history mutation logic will become increasingly brittle as the app grows.

Note: Current behavior is functional and deep-linking works. This is refactoring work, not a correctness issue.

Acceptance Criteria:
- Define a single routing/state strategy for path and query-param management.
- Reduce duplicated `popstate`, URL parsing, and history mutation logic across pages and providers.
- Preserve current shareable URL behavior for filters and drill-down views.

---

### 7. Refactor oversized repository and page modules

- Severity: Low
- Type: Maintenance
- References: `packages/server/database/repositories/document-repository.ts`, `packages/client/pages/Home/index.tsx`

Problem:
Some repository and page modules accumulate too many responsibilities, mixing orchestration, data transformation, and presentation concerns in single files. Feature work, reviews, and debugging will slow as these files grow.

Acceptance Criteria:
- Split document repository logic by document family or capability.
- Separate large client pages into data-loading/state, view-model, and presentational layers where practical.
- Preserve existing route behavior and user-visible functionality.

---

### 4. Reconcile backlog and documentation with the live repository state

- Severity: Low *(was Medium)*
- Type: Maintenance
- References: `README.md`, `AGENTS.md`, `scripts/README.md`, `tsconfig.json`

Problem:
Documentation has drifted from the live repository state. `tsconfig.json` already enables `strict` and `noImplicitAny`, while docs still mention `.issues`, JSON page-file storage, and a non-existent `PRODUCTION_SETUP.md`. No user impact, but onboarding is harder than it needs to be.

Acceptance Criteria:
- Remove or replace stale backlog entries that no longer describe real work.
- Point deployment docs to `scripts/README.md` instead of `PRODUCTION_SETUP.md`.
- Remove or fix `.issues` guidance.
- Update storage architecture text to match `raw.db` / `parsed.db`.
- Ensure root docs, agent docs, and backlog items do not contradict the codebase.

---

## Group F — Data Pipeline Expansion

Tables already scraped or migrated but not yet exposed. Can be handled incrementally in any order.

### 25. Leverage RollCallReport and attendance data for participation analytics

- Severity: Medium
- Type: Feature
- References: `packages/server/database/repositories/analytics-repository.ts`, `packages/datapipe/migrator/migrations/`

Problem:
`RollCallReport` and `RollCallEntry` tables exist in the schema and data is migrated, but the analytics layer does not use them. Combined with vote-level data, these records could power accurate attendance tracking per representative, session, and government period.

Acceptance Criteria:
- Add analytics queries that calculate attendance rate per representative across sessions.
- Add attendance trend views filterable by government period and year.
- Surface the data on the Insights page alongside existing participation panels.
- Ensure outputs are filterable by government period and produce shareable URLs.

---

### 26. Map section-to-voting relationships via SaliDBKohtaAanestys

- Severity: Medium
- Type: Feature
- References: `packages/datapipe/migrator/SaliDBKohtaAanestys/`, `packages/server/routes/session-routes.ts`

Problem:
`SaliDBKohtaAanestys` is migrated and links agenda sections to specific votings, but is not used in any route or UI. This data would enable a complete legislative workflow view: agenda item → linked document → voting result.

Acceptance Criteria:
- Add an API endpoint or augment existing section detail responses to include linked votings via `SaliDBKohtaAanestys`.
- Show the section → voting relationship inline on session detail views.
- Enable navigation from a voting back to its originating agenda section.

---

### 24. Expose SaliDBTiedote (session notices) in the API and UI

- Severity: Low
- Type: Feature
- References: `packages/server/routes/session-routes.ts`, `packages/datapipe/migrator/SaliDBTiedote/`

Problem:
`SaliDBTiedote` (session notices) is fully migrated into the database as `SessionNotice` but has no API endpoint and is invisible to users. It contains session schedule changes, validity periods, and official session announcements.

Acceptance Criteria:
- Add an API endpoint to retrieve notices by session or date range.
- Surface notices on the Sessions page alongside section and speech data.

---

### 23. Migrate and expose SeatingOfParliament data

- Severity: Low
- Type: Feature
- Reference: `packages/datapipe/migrator/`, `packages/shared/constants/index.ts`

Problem:
`SeatingOfParliament` is always fully scraped (it is in `AlwaysFullScrapeTables`) but has no migrator and is excluded from the pipeline. It likely contains electoral-cycle seating and composition data that could power parliament composition views.

Acceptance Criteria:
- Investigate the raw scraped shape and determine which fields are meaningful.
- Create a migrator and SQL migration for a `SeatingOfParliament` table in the final schema.
- Expose at least one API endpoint and surface a minimal representation in the UI (e.g. the Composition page).

---

### 27. Add Attachment and AttachmentGroup pipeline support

- Severity: Low
- Type: Feature
- Reference: `packages/shared/constants/index.ts`, `packages/datapipe/migrator/`

Problem:
`Attachment` and `AttachmentGroup` tables are defined in the table constants but have no migrators and are excluded from the pipeline. Parliamentary document attachments (supporting materials, annexes, background documents) remain inaccessible.

Acceptance Criteria:
- Investigate the raw API shape of `Attachment` and `AttachmentGroup`.
- If meaningful data exists, create migrators and link attachments to their parent VaskiDocuments.
- Surface download links for document attachments in the document detail cards.

---

## Group G — Product Features

Larger features requiring cross-cutting work across backend, frontend, and potentially data pipeline.

### 9. Build a first-class unified search experience

- Severity: Medium
- Type: Feature
- References: `packages/server/routes/documents/search-routes.ts`, `packages/server/routes/person-routes.ts`

Problem:
Search exists in fragments for specific entity types, but the application does not provide a unified search experience across people, documents, sessions, sections, and votings.

Acceptance Criteria:
- Add a global search entry point in the UI.
- Return grouped results by entity type from a single user flow.
- Support direct navigation to matched MPs, documents, sessions, sections, and votings.

---

### 10. Expand document journey and relationship views

- Severity: Medium
- Type: Feature
- References: `packages/client/pages/Documents/index.tsx`, `packages/server/routes/voting-routes.ts`

Problem:
The application exposes many legislative document families, but lifecycle and relationship exploration remains limited.

Acceptance Criteria:
- Show richer timelines, linked votings, committee handling, related documents, and signer relationships for supported document types.
- Reuse existing relation endpoints where possible.
- Keep document-family-specific details discoverable without forcing users through raw identifiers.

---

### 11. Deepen person and party analytics with longitudinal behavior views

- Severity: Low
- Type: Feature
- References: `packages/client/pages/Insights/index.tsx`, `packages/server/database/repositories/analytics-repository.ts`

Problem:
Current analytics are useful but still largely panel-based and snapshot-oriented.

Acceptance Criteria:
- Add time-based views for party discipline, attendance/participation, speech activity, and coalition/opposition behavior.
- Ensure outputs remain filterable by government period and date range.
- Preserve shareable URLs for analytics drill-downs.

---

### 12. Turn data-quality tooling into an operator-facing monitoring surface

- Severity: Low
- Type: Feature
- References: `packages/server/sanity/checks.ts`, `packages/server/routes/sanity-routes.ts`, `packages/client/pages/Laadunvalvonta/index.tsx`

Problem:
The repository has useful sanity and data-quality machinery, but the surfaced operator view is still narrow.

Acceptance Criteria:
- Expose run history, failure trends, freshness indicators, and unresolved issues.
- Distinguish operator-facing diagnostics from public-facing transparency views.
- Make it easier to identify the latest broken checks and stale data at a glance.

---

### 13. Add export and researcher-friendly data access features

- Severity: Low
- Type: Feature
- References: `packages/client/pages/Documents/index.tsx`, `packages/client/pages/Insights/index.tsx`, `packages/client/pages/Sessions`, `packages/client/pages/Votings`

Problem:
The application is research-oriented, but key filtered views do not yet emphasize export and extraction workflows.

Acceptance Criteria:
- Add CSV and/or JSON export for major filtered views.
- Preserve active filters in exported datasets.
- Document available export surfaces for users who want reproducible research workflows.

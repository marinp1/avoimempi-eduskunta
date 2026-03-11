# Project Issues

Issues are grouped by context to make batched work easier. Numbers are preserved from original tracking for reference.

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

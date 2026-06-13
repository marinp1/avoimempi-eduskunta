# Architecture & Data Pipeline Review

Date: 2026-06-10 · Branch: `htmx` (a3f1a20)

Findings gathered by three parallel codebase sweeps (server, datapipe,
shared/infra) and spot-verified by direct reads of `migrate.ts`,
`PERFORMANCE_REVIEW.md`, and the cache/trace layers.

## TL;DR

The architecture is disciplined and production-ready. The feature-module
pattern (Route → Service → Repository → View Model → Page/Fragment) holds
across all 8 features; the server/datapipe boundary is exceptionally clean
(server never touches row stores, datapipe never reads server code); SQL
contract testing (compile-time + runtime snapshot, ~9.6k LOC of tests) is
genuinely strong.

Material risks cluster in three places:

1. **Performance debt documented in `PERFORMANCE_REVIEW.md` (2026-06-10) —
   none of it fixed yet.** Two measured hotspots (979 ms party-summary,
   443 ms person-metrics) block the single-threaded event loop per uncached
   request.
2. **Migrator failure semantics**: destructive clear-then-rebuild with no
   cross-table atomicity.
3. **Unbounded server memory growth** (trace memos, count-capped-not-size-capped
   response cache).

## Server application

### Strengths

- Consistent DI via `WebappDeps` (`routes/webapp/deps.ts`); all 242 query
  sites use prepared statements with typed `$param` binds; read-only
  connection with `query_only` pragma.
- XSS: auto-escaping JSX runtime + `SafeHtml` (`src/jsx/jsx-runtime.ts`),
  security-headers middleware with CSP, both tested.
- Trace/provenance system (`src/database/trace-collector.ts`) is
  sophisticated and well-tested, with bounded per-request overhead
  (caps at 200 PKs / 400 rows scanned per statement).
- On-device AI summaries (`src/client/ai-summary-island.ts`) keep the server
  thin — no server-side LLM calls. The external LLM analysis tool is
  correctly placed in datapipe as batch ETL (multi-provider factory in
  `packages/datapipe/llm/`), not yet surfaced in the UI.

### Weaknesses

- **W1 (perf, measured)**: `analytics-party-summary.sql` ≈ 979 ms and
  `person-metrics.sql` ≈ 443 ms run per uncached request; data is immutable
  between migrations and `generationKey` exists, so this is pure waste.
  (`PERFORMANCE_REVIEW.md` #1–2)
- **W2 (perf)**: no HTTP compression anywhere; debate pages are 0.6–1.2 MB
  raw. (#3)
- **W3 (correctness + perf)**: `/aanestykset` fetches 500 rows and filters in
  JS, ignoring the `$query`/`$phase` params its own SQL supports;
  `totalCount` is wrong. (`votings-list-route.ts:33`,
  `voting/pages/list.view-model.ts:126`) (#4)
- **W4 (stability)**: cache stampede — no in-flight dedup in
  `src/cache/response-cache.ts`; count-capped (2000) not size-capped;
  `pageTraceMemo`/`pageTracePathMemo` (`trace-collector.ts:287-289`) grow
  without bound → crawler-induced OOM risk. (#5–7)
- **W5 (perf)**: N+1 in `SessionService.getSessionDetail` (per-section
  queries), `DocumentService.listAllKinds` (~26 queries/request),
  `db.prepare()+finalize()` instead of statement-caching `db.query()` in all
  repos except analytics. (#8–10)
- **W6 (validation)**: roster filter params (`party`, `bloc`, `sort`) lack
  server-side whitelist validation (`helpers/template-helpers.ts:69-131`).
  Low actual risk (parameterized SQL), but inconsistent with other routes.
- **W7 (test gaps)**: services and view-model builders are untested; no
  htmx-fragment (HX-Request/HX-Target) integration tests. SQL layer coverage
  is excellent; business logic relies on manual testing.

## Data pipeline

### Strengths

- Scraper: resumable (maxPk+1), gap auto-repair, revision tracking with
  element-wise diffs, retry with exponential backoff, range/patch modes —
  all tested (~5.7k LOC datapipe tests).
- Parser: hash-based skip of unchanged rows; full-table skip when raw
  unchanged.
- Row store (`shared/storage/row-store/providers/sqlite.ts`): STRICT tables,
  WAL, per-table brotli/gzip compression, schema-hash tracking.
- Migrator runs `ANALYZE` post-import (critical — known gotcha) and rebuilds
  the trace DB.

### Weaknesses

- **W8 (integrity, verified)**: `migrate.ts` clears ALL tables (lines
  406-418) _outside_ any transaction, sets `synchronous = OFF` (line 392),
  and uses per-table transactions only (lines 451, 600). A failure mid-run
  leaves a partially populated DB with no rollback of completed tables.
  Production is shielded by the symlink-flip deploy (pipeline builds a fresh
  file, then flips `current.db`), but local/dev runs write
  `getDatabasePath()` directly — a failed `bun run migrate` bricks the local
  DB until a rerun succeeds.
- **W9 (resilience)**: no row-level error recovery — one malformed row aborts
  the whole table import; `JSON.parse` of raw rows in `parser/parser.ts:302`
  and `migrator/fn/MemberOfParliament.ts:323` has no try-catch; a single
  corrupt VaskiData XML doc stops all document types.
- **W10 (cost)**: full clear-and-rebuild every migration — O(N) re-import
  even when one upstream row changed. Parser supports PK ranges; migrator
  doesn't. Acceptable for a nightly batch, but rebuild cost grows with the
  dataset.
- **W11 (drift)**: API schema changes are hash-tracked but not surfaced —
  new API columns can be silently dropped; migrator skip logic doesn't
  account for migrator-code changes (only raw-data changes).
- **W12 (test gap)**: no end-to-end pipeline test (scrape→parse→migrate with
  fixture data); no partial-failure scenario tests.

## Shared / infra (minor)

- **W13**: `PrimaryKeys` uses `""` sentinel for 14 PK-less tables
  (`shared/constants/index.ts:33-51`) — use `null` + startup assertion.
- **W14**: path-resolution logic duplicated ~5× in
  `shared/database/index.ts`; `StorageKeyBuilder` retains dead
  `raw/parsed/page_*` key patterns (`shared/storage/types.ts:107-117`).
- Infra (Hetzner single VM, two systemd services, symlink-flip releases) is
  appropriately minimal; CI runs typecheck + lint + tests with frozen
  lockfile. No deficiencies needing action now.

## Remediation roadmap (recommended order)

### Phase A — measured performance hotspots (highest user impact)

1. **Per-generation memoization or migrate-time precomputation** of
   `party-summary` and `person-metrics` aggregates, keyed by
   `generationKey`. Memoization in the service layer is the smaller change;
   precomputed tables in `post-import.ts` the more durable one — memoization
   first, it ships in hours. Files:
   `features/analytics/analytics.repository.ts`,
   `features/person/person.repository.ts`
   (`fetchPersonMetricsWithBaselines`, line 283).
2. **gzip/brotli at the response-cache layer** — compress once on store,
   serve compressed on hit, `Vary: Accept-Encoding`. File:
   `src/cache/response-cache.ts`.
3. **Cache hardening**: in-flight `Map<key, Promise<Response>>` dedup
   (~15 lines), byte-size cap with LRU eviction, LRU cap on
   `pageTraceMemo`/`pageTracePathMemo` in `trace-collector.ts`.
4. **Wire `/aanestykset` filters into SQL** (params already exist in
   `voting-list.sql`) and fix `totalCount`.

### Phase B — pipeline integrity

5. **Build-then-swap for local migrate**: write to a temp DB file and
   atomically rename over `getDatabasePath()` on success (mirrors the prod
   symlink pattern), eliminating the broken-DB window. File:
   `migrator/migrate.ts`.
6. **Row-level error isolation**: try-catch around per-row migrator/parse
   calls with a logged skip-count and failure report (reuse the
   changes-report infrastructure), so one bad row doesn't abort a table.
7. **Schema-drift alerting**: log a prominent warning (and write to the
   changes report) when a new `column_schemas` hash appears for a table
   mid-scrape.

### Phase C — N+1 and over-fetch cleanups (opportunistic)

8. Batch `SessionService.getSessionDetail` per-section queries with
   `IN (...)`; route `DocumentService.listAllKinds` through the existing
   `FederatedSearchFts`; bulk-switch repos from `db.prepare()/finalize()` to
   `db.query()` (trace wrapper already handles cached statements); push date
   filtering into `getSessionIndex` SQL.

### Phase D — hygiene

9. Server-side whitelist for roster `party`/`bloc`/`sort` params;
   `PrimaryKeys` null sentinel + startup assertion; dedupe path-resolution
   helpers; prune dead `StorageKeyBuilder` patterns.
10. Add service/view-model unit tests and one end-to-end pipeline fixture
    test (TDD per project convention).

## Verification (per phase)

- `bun run typecheck && bun test` after each phase.
- Phase A: re-run the timings in `PERFORMANCE_REVIEW.md` "Measurements"
  against the real DB (target: second render of home/person pages < 50 ms;
  `Content-Encoding` present on debate pages; concurrent identical requests
  produce one handler execution).
- Phase B: simulate a mid-migrate failure (throw in a table migrator) and
  confirm the previous DB file remains intact and readable.

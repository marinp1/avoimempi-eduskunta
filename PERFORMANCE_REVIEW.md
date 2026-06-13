# Webapp Performance Review

Date: 2026-06-10 · Branch: `htmx` (af79c1c)
Findings verified against the real 3.8 GB `avoimempi-eduskunta.db` with timed queries.

## TL;DR

Foundations are good: read-only WAL connection, `ANALYZE` stats present, covering
indexes on the 4.3M-row `Vote` table, an HX-aware response cache, immutable asset
URLs, and module-level caches for timeline/government data. Four structural
problems remain:

1. Every query blocks the single-threaded event loop; the worst take 0.5–1s.
2. Several routes recompute global aggregates per request that should be
   computed once per migration (data is immutable between migrations and
   `generationKey` already exists).
3. No HTTP compression despite multi-MB pages.
4. Two server-side memos grow without bound.

## High impact

### 1. ~1s blocked event loop per uncached home render

`packages/server/src/features/analytics/sql/analytics-party-summary.sql` joins
`Vote` (4.3M rows) against group memberships over the whole term — measured
**979 ms** with a full-term window. bun:sqlite is synchronous on one shared
connection, so that second stalls every concurrent request. The home page is
timeline-scrubbable: each `?date=` position is a distinct URL → distinct cache
key → fresh 1s run. The `INDEXED BY` hints in that SQL suggest this has hurt
before.

### 2. Person pages recompute metrics for all 714 MPs to show one

`fetchPersonMetricsWithBaselines` (`person.repository.ts:283`) runs
`person-metrics.sql`, which aggregates the entire `Vote` and `Speech` tables
grouped by person — measured **443 ms** — then picks one row in JS. Every first
view of every MP profile pays this.

**Fix for both:** precompute these aggregates into tables at migrate time (the
pipeline already runs ANALYZE there), or memoize in-process keyed by
`generationKey`. Turns 1s-per-URL into a one-time cost.

### 3. No HTTP compression anywhere

Bun.serve doesn't gzip; no `Content-Encoding` handling exists. Debate sections
run 300–420 speeches with **0.6–1.2 MB raw text** (`/keskustelu` fetches
`limit: 500` full contents in one response, `debate-route.ts:52`), so
worst-case pages are ~2 MB of uncompressed HTML. gzip/brotli cuts transfer
5–10×. Cheapest path: compress once when storing into the response cache,
serve the compressed body on hits.

### 4. `/aanestykset` ignores its own SQL filters

`votings-list-route.ts:33` fetches 500 rows on every request, then filters by
search query in JavaScript (`voting/pages/list.view-model.ts:126`). The
sargable SQL with `$query`/`$phase` params in `voting-list.sql` exists but the
route never passes them. Each request also pays the `GROUP_CONCAT` subquery
materializing all 48k `SaliDBDocumentReference` rows regardless of LIMIT.
`totalCount` is also wrong (capped at the 500 fetched).

## Medium impact

### 5. No in-flight request dedup (cache stampede)

`src/cache/response-cache.ts` — concurrent misses on the same key each execute
the handler; with sync queries they queue serially (5 users on uncached home =
5 sequential 1s runs). Fix: `Map<key, Promise<Response>>` of in-flight
handlers, ~15 lines.

### 6. Response cache is count-capped, not size-capped

2000 entries × multi-MB debate pages = multi-GB worst case. Track total bytes,
evict on size.

### 7. Unbounded trace memos

`pageTraceMemo` / `pageTracePathMemo` (`src/database/trace-collector.ts:287-289`)
append on every distinct URL render, never evict, each entry holding up to 200
PKs + labels per source table. A crawler walking query-string variations grows
this until OOM. Needs an LRU cap.

### 8. N+1 queries in `SessionService.getSessionDetail`

`session.service.ts:41-94`: one `fetchSectionVotings` per section, one
`fetchSectionRollCall` per section until one matches, one
`fetchWrittenQuestionByIdentifier` per identifier. Also
`HomeRepository.enrichLatestDaySessions` runs `fetchSessionNotices` per
session. All batchable with `IN (...)` + group-by-key.

### 9. `DocumentService.listAllKinds` fan-out

`document.service.ts:41` runs ~13 kinds × (list + count) ≈ 26 queries per
request, materializes ~1300 rows in JS, returns one page, reports a wrong
`totalCount` (capped at 100/kind). A `FederatedSearchFts` table already exists —
the merged view should use it.

### 10. `db.prepare()` + `finalize()` per call everywhere

`document.repository.ts` (53×), `person`, `session`, `voting` repos re-parse
and re-plan SQL on every request; only `analytics.repository.ts` uses Bun's
statement-caching `db.query()`. The trace monkey-patch also runs a
`normalizeSql` regex over the full SQL text on every prepare. Switch to
`db.query()` — the `__traceWrapped` guard already handles cached statements
correctly.

### 11. `getSessionIndex` over-fetch

`session.service.ts:24` fetches 2000 rows per request and date-filters in JS —
push the date range into SQL.

## Minor

- `HomeRepository.fetchOverview` wraps synchronous calls in
  `Promise.all(Promise.resolve(...))` — zero actual concurrency; hides that the
  request runs ~8 sequential queries.
- Non-sargable `LIKE '%q%'` across 5 columns in `COMMITTEE_REPORTS_LIST`,
  `EXPERT_STATEMENTS_LIST`, `PARLIAMENT_ANSWERS_*` — fine at current table
  sizes; migrate to the existing FTS index eventually.
- Client bundle is fine: 70 KB minified, immutable-cached with content-hash
  versioning.

## Suggested order of attack

1. Memoize/precompute `person-metrics` and `party-summary` per generation
   (eliminates the two measured 0.4–1s hotspots).
2. Add gzip at the response-cache layer.
3. Add in-flight dedup + a size cap to the cache; LRU cap on the trace memos.
4. Wire `/aanestykset` search/filter params into `voting-list.sql` instead of
   JS filtering.
5. Then the medium N+1 / over-fetch items (8, 9, 10, 11) opportunistically.

## Measurements (for re-verification)

```
analytics-party-summary.sql (full-term window) ............ 979 ms
person-metrics.sql (all persons, NULL date bounds) ......... 443 ms
Vote rows .................................................. 4,310,086
Speech rows ................................................ 145,093
Voting rows ................................................ 21,659
SaliDBDocumentReference rows ............................... 48,862
Largest debate section payload (300-420 speeches) ......... 0.6–1.2 MB raw text
Client bundle (minified) ................................... 70 KB
sqlite_stat1 rows (ANALYZE present) ........................ 195
```

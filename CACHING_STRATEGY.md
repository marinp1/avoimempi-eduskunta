# Caching Strategy

## Goals
- Reduce response times for read-heavy API endpoints.
- Keep data correctness strict after ETL/migration runs.
- Avoid stale-data surprises in admin/status flows.
- Keep implementation simple (in-process first, distributed-ready later).

## Constraints In This Project
- Server runs read-only against `avoimempi-eduskunta.db`.
- Data changes in batches (scrape/parse/migrate), not continuously.
- Existing sanity/status cache already exists (`StatusController`).
- API is mostly GET endpoints with deterministic query outputs.

## Proposed Architecture

### Layer 1: Dataset Versioning
- Introduce a single `datasetVersion` string used in all cache keys.
- Source of truth:
  - `_migration_info.last_migration` (preferred), fallback to `PRAGMA user_version`.
- Refresh behavior:
  - Refresh lazily every N seconds (for safety).
  - Explicitly bump/invalidate on successful migration completion.

Key effect:
- All cache entries become automatically obsolete when dataset version changes.

### Layer 2: In-Process Response Cache
- Add a generic cache service for GET responses:
  - Key: `${datasetVersion}:${routeId}:${normalizedParams}`
  - Value: serialized JSON payload + metadata.
- Features:
  - TTL per endpoint category.
  - LRU size cap (entry count + byte cap).
  - In-flight deduplication (`singleflight`) to avoid duplicate DB work.
  - Optional stale-while-revalidate for expensive analytics endpoints.

### Layer 3: HTTP Caching
- Add `ETag` and `Cache-Control` headers for cacheable GET responses.
- Suggested header policy:
  - Stable read endpoints: `public, max-age=60, stale-while-revalidate=300`
  - Expensive analytics endpoints: `public, max-age=120, stale-while-revalidate=600`
  - Admin/progress/status endpoints: `no-store`
- If `If-None-Match` matches, return `304`.

### Layer 4: Client-Side Caching
- Keep server as source of truth.
- Add/standardize fetch layer cache semantics (short-term):
  - Respect `ETag`/`304`.
  - Reuse responses per route+params in memory.
- If moving to a query library later, map stale times to same endpoint classes as server.

## Invalidation Rules

### Hard Invalidation
- Trigger on migration completion:
  - `statusController.invalidateCache()`
  - `apiCache.invalidateAll()`
  - `datasetVersion.refreshNow()`

### Soft Invalidation
- TTL expiry.
- Optional targeted invalidation by tags if endpoint group needs manual clear.

## Endpoint Policy (Initial)

### No Cache
- `/api/health`
- `/api/admin/*`
- `/api/scraper/status`
- `/api/parser/status`
- `/api/migrator/status`
- `/api/status/source-data`

### Short TTL (15-60s)
- `/api/status/overview`
- `/api/status/sanity-checks`
- `/api/session-dates`
- `/api/day/:date/*`

### Medium TTL (60-300s)
- `/api/composition/:date`
- `/api/person/:id/*`
- `/api/sessions`
- `/api/sections/:sectionKey/*`
- `/api/votings/:id`

### Longer TTL (120-600s)
- `/api/analytics/*`
- `/api/insights/*`
- `/api/parties/*`
- `/api/search`

## Suggested Implementation Plan

### Phase 1: Core Cache Utilities
- Add files:
  - `packages/server/cache/dataset-version.ts`
  - `packages/server/cache/response-cache.ts`
  - `packages/server/cache/cache-policy.ts`
- Provide:
  - `getOrSet(key, ttlMs, loader)`
  - `invalidateAll()`
  - `stats()`

### Phase 2: Route Integration
- Add helper in `packages/server/index.ts`:
  - `cachedJson(routeId, req, policy, loader)`
- Migrate heavy GET endpoints first:
  - analytics, insights, composition, sessions.

### Phase 3: Migration Hook Invalidation
- In `packages/server/admin.ts`, on successful migration:
  - invalidate status cache and API cache in same completion callback.

### Phase 4: Observability
- Add cache metrics endpoint in dev/admin:
  - hits, misses, stale serves, evictions, memory estimate, in-flight dedup hits.

## Cache Key Normalization Rules
- Sort query params by key.
- Omit null/empty params.
- Normalize date params to `YYYY-MM-DD` where relevant.
- Normalize pagination defaults (e.g. explicit page=1/limit=20).

## Correctness Safety Notes
- Do not cache mutation endpoints.
- Keep TTL conservative where data can appear time-sensitive.
- Always include `datasetVersion` in cache key.
- For sanity/status pages, keep manual invalidation in addition to TTL.

## Performance Targets
- P50 GET latency reduction: 40-70% on repeated requests.
- DB query volume reduction: 50%+ on dashboard/analytics navigation.
- No stale data after migration completion (hard requirement).

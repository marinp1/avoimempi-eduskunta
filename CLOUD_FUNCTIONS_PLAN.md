# Cloud Functions Migration Plan

## Model

**Local**: Run the full initial pipeline (scrape → parse → migrate) on a
local machine to build the dataset. Deploy the resulting SQLite artifact
to the server.

**Cloud**: Short-running serverless functions handle incremental sync only.
Parliamentary data changes slowly; each invocation processes only new rows
and completes in seconds. Eventual sync is acceptable.

### Cost budget

| Parameter | Value |
|-----------|-------|
| Tables | 19 |
| Max concurrency | 20 (covers all tables in one wave) |
| Max runtime per function | 5 min |
| Schedule | Every 8 hours (3×/day) |
| Max daily spend | 20 × 5 min × 3 = **300 function-minutes/day** |

Each 8-hour cycle: inspector fires once → enqueues 19 inspect tasks → up to
19 scrape tasks + 19 parse tasks run in parallel → done in minutes.

---

## Target Architecture

```
  Local machine (one-off / ad-hoc)
  ─────────────────────────────────
  bun run scrape <table>    →  raw.db
  bun run parse  <table>    →  parsed.db
  bun run migrate           →  avoimempi-eduskunta.db  ──▶  Object Storage
                                                               │
                                                        server downloads
                                                               ▼
                                                        App Server DB


  Cloud (scheduled, ongoing)
  ──────────────────────────

  Cron (every 8 hours)
       │
       ▼
  Inspector Function                        < 30s, enqueues up to 19 tasks
  (skipGapDetection=true always)
       │ 19 × scrape-table tasks
       ▼
  Scraper Functions  ×19 parallel           < 5 min each (incremental tail)
  (maxPagesPerInvocation=200 cap)
       │ 19 × parse-table tasks
       ▼
  Parser Functions   ×19 parallel           < 5 min each (bounded PK range)
```

Migrator remains a **local / manual operation** — it does a full truncate +
reimport which can take 5–30 min, exceeding the function time limit. Run it
locally whenever a schema migration lands or a full resync is needed.
The migrator output is uploaded to Object Storage and the server picks it up.

---

## The One Real Blocker: Shared Storage

`raw.db` and `parsed.db` are local SQLite files. Cloud functions are
stateless and cannot share local files between invocations.

**Block volumes do NOT work here.** Scaleway Block Storage attaches only
to Instances (VMs), not to Serverless Containers or Functions. There is
no shared filesystem option in the Scaleway serverless offering.

The `IRowStore` interface is already provider-agnostic. Two practical options:

### Option A — Managed PostgreSQL (~€15/month)

Implement `PostgresRowStore` satisfying the existing `IRowStore` interface.
The schema maps directly from SQLite:

```sql
-- raw store
CREATE TABLE raw_rows (
  table_name TEXT NOT NULL, pk INTEGER NOT NULL,
  column_hash TEXT, data JSONB NOT NULL, hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (table_name, pk)
);
CREATE TABLE raw_column_schemas (
  hash TEXT PRIMARY KEY, table_name TEXT NOT NULL,
  pk_name TEXT NOT NULL, column_names TEXT[] NOT NULL,
  first_seen TIMESTAMPTZ NOT NULL
);

-- parsed store (same structure, no column_schemas table)
CREATE TABLE parsed_rows (
  table_name TEXT NOT NULL, pk INTEGER NOT NULL,
  data JSONB NOT NULL, hash TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (table_name, pk)
);
```

All key operations map directly:
- `count(tableName)` → `SELECT COUNT(*) WHERE table_name = ?`
- `maxPk(tableName)` → `SELECT MAX(pk) WHERE table_name = ?`
- `list(tableName)` → streaming cursor `WHERE table_name = ? ORDER BY pk`
- `upsertBatch(...)` → `INSERT ... ON CONFLICT DO UPDATE`

Concurrent access from all functions is safe with no special handling.
Seed once by importing locally-built SQLite data via a migration script.

**Verdict**: Cleanest option. Minimal implementation complexity.

### Option B — Object Storage + metadata sidecar (~€0–1/month)

Implement `S3RowStore`. Store each row as `{store}/{tableName}/{pk}.json`.
The expensive operations (`count`, `maxPk`) need a sidecar:
`{store}/{tableName}/_meta.json` — updated on every `upsertBatch` with
`{ count, maxPk, updatedAt }`. Since concurrent upserts could race on
the sidecar, accept occasional stale counts (fine for this workload —
inspector only uses them for an approximate comparison).

- Lower running cost than PostgreSQL.
- Higher implementation complexity.
- `list()` requires a prefix LIST + individual GETs — acceptable for
  sequential parser reads but slower than a DB cursor.

**Verdict**: Worth it only if the €15/month PostgreSQL cost is a concern.

### Recommendation

**Start with Managed PostgreSQL (Option A).** It maps cleanly to the
existing interface and handles all edge cases correctly. The €15/month
cost is negligible versus the engineering time of implementing S3 locking.

---

## Changes Required

### Inspector — no code changes

Already fast (<30s), already has `skipGapDetection` flag. Always set it
to `true` for cloud-triggered tasks — gap repair is a local concern.

**Trigger**: Cron every 8 hours.

---

### Scraper — `maxPagesPerInvocation` implemented ✓

`PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION=200` acts as a safety valve.
At 25ms/request, 200 pages ≈ 5–15 seconds in practice for incremental
tails. If the cap is hit, the scraper re-enqueues a continuation task
and still enqueues a parse task for the completed portion.

Set in cloud deployment env. Unset locally (unlimited).

**Trigger**: SQS. Max concurrency: 20.

---

### Parser — no code changes

Already bounded by PK range. Hash-skip makes re-processing unchanged rows
essentially free.

**Trigger**: SQS. Max concurrency: 20.

---

### Migrator — stays local

Full truncate + reimport can take 5–30 min. Keep as local CLI operation.
Run after schema migrations or full resyncs. Upload the resulting
`avoimempi-eduskunta.db` to Object Storage; server picks it up on startup.

---

## Implementation Order

1. **Implement `PostgresRowStore`** — new file in
   `packages/shared/storage/row-store/providers/postgres.ts`, factory
   selection via `ROW_STORE_PROVIDER=postgres` env var.

2. **Seed PostgreSQL** — one-off script to import locally-built `raw.db`
   and `parsed.db` into the Postgres tables.

3. **Deploy Inspector** — Serverless Container, cron trigger every 8h,
   `skipGapDetection: true`, `ROW_STORE_PROVIDER=postgres`.

4. **Deploy Scraper** — Serverless Container, SQS trigger, concurrency 20,
   5-min timeout, `PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION=200`.

5. **Deploy Parser** — Serverless Container, SQS trigger, concurrency 20,
   5-min timeout.

6. **(Later) Object Storage row store** — if running cost becomes a concern.

---

## What Does NOT Need to Change

- Task envelope contracts and validation.
- Inspector, scraper, and parser handler functions.
- SQS adapter and queue topology (3 queues + 3 DLQs).
- Scraper resumability, PK range modes, and truncation/continuation logic.
- Parser hash-skip deduplication.
- Changelog DB.
- Migrator logic (stays local).

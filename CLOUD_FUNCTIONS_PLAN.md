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

## The One Real Blocker: Shared Storage (solved)

`raw.db` and `parsed.db` are local SQLite files. Cloud functions are
stateless and cannot share local files between invocations.

**Block volumes do NOT work here.** Scaleway Block Storage attaches only
to Instances (VMs), not to Serverless Containers or Functions.

### Solution: Scaleway Serverless SQL Database (~€2/month)

A PostgreSQL-compatible serverless database that scales to zero when idle.
Billing is per vCPU-second with a 5-minute minimum window per active session.

**Cost for this workload**:
- 3 runs/day × 5-min minimum window × €0.13572/vCPU/hour ≈ **€1/month compute**
- ~5–10 GB storage × €0.000272/GB/hour ≈ **€1/month storage**
- **Total: ~€2/month**

**Implementation**: `PostgresRowStore` is already implemented in
`packages/shared/storage/row-store/providers/postgres.ts`. It satisfies
the same `IRowStore` interface as `SqliteRowStore` with identical semantics.

Schema (auto-created on first connection):
```sql
-- raw store
raw_column_schemas(hash PK, table_name, pk_name, column_names, first_seen)
raw_rows(table_name, pk, column_hash, data, hash, updated_at, PK(table_name,pk))

-- parsed store
parsed_rows(table_name, pk, data, hash, updated_at, PK(table_name,pk))
```

Enable via env vars:
```bash
ROW_STORE_PROVIDER=postgres
ROW_STORE_DATABASE_URL=postgres://user:pass@host:5432/dbname
```

Seed once by importing locally-built SQLite data into PostgreSQL.
Cloud functions then append incrementally via `upsertBatch`.

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

1. ✅ **`PostgresRowStore` implemented** — `providers/postgres.ts`, factory
   selection via `ROW_STORE_PROVIDER=postgres` + `ROW_STORE_DATABASE_URL`.

2. ✅ **`maxPagesPerInvocation` implemented** — scraper self-limits and
   re-enqueues remainder; `PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION=200`.

3. **Provision Scaleway Serverless SQL Database** — Terraform resource,
   output the connection URL as a secret.

4. **Seed PostgreSQL** — one-off local script to stream `raw.db` /
   `parsed.db` rows into the Postgres tables via `PostgresRowStore`.

5. **Deploy Inspector** — Serverless Container, cron trigger every 8h,
   `skipGapDetection: true`, `ROW_STORE_PROVIDER=postgres`.

6. **Deploy Scraper** — Serverless Container, SQS trigger, concurrency 20,
   5-min timeout, `PIPELINE_SCRAPER_MAX_PAGES_PER_INVOCATION=200`.

7. **Deploy Parser** — Serverless Container, SQS trigger, concurrency 20,
   5-min timeout.

---

## What Does NOT Need to Change

- Task envelope contracts and validation.
- Inspector, scraper, and parser handler functions.
- SQS adapter and queue topology (3 queues + 3 DLQs).
- Scraper resumability, PK range modes, and truncation/continuation logic.
- Parser hash-skip deduplication.
- Changelog DB.
- Migrator logic (stays local).

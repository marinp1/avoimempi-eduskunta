# Datapipe Local/Scaleway Feature Parity Plan

## Summary

The datapipe orchestration works correctly in a single-node deployment. Several gaps exist between the local ElasticMQ dev environment and the production Scaleway MNQ environment that should be addressed before scaling horizontally.

---

## Concerns

### 1. Row Store Isolation (Critical)

**Gap**: The raw and parsed row stores (`raw.db` / `parsed.db`) are local SQLite files. In a multi-container Scaleway deployment each container gets its own isolated copy — scraped data written by one scraper container is invisible to parser containers and to the inspector.

**Impact**: Correctness breaks when running more than one scraper or parser replica.

**Fix options**:
- Mount a shared NFS/EFS volume across all containers (simplest, single-AZ)
- Implement an S3-backed `RowStore` provider (cloud-native, scalable) — the storage abstraction in `packages/shared/storage/row-store/` is already provider-agnostic
- Restrict to one replica per worker type (acceptable short-term workaround)

**Files affected**: `packages/shared/storage/row-store/providers/`, `packages/shared/storage/row-store/factory.ts`

---

### 2. Local DLQ Never Triggers (Medium)

**Gap**: The `bootstrap` command creates queues via `ensureQueue()` but does not configure a redrive policy on ElasticMQ. Wrong-type messages loop indefinitely in the queue rather than being routed to a DLQ after 3 attempts.

**Impact**: A misrouted message in local dev can starve a worker queue indefinitely. Does not affect Scaleway (Terraform sets `max_receive_count=3` on all queues).

**Fix**: Update `ensureQueues()` in `cli.ts` to also create DLQ queues and set redrive policies when bootstrapping locally. ElasticMQ supports redrive policy via the `RedrivePolicy` queue attribute.

**Files affected**: `packages/datapipe/orchestration/cli.ts` (`ensureQueues`)

---

### 3. Changelog DB Fragmented Across Containers (Low)

**Gap**: The changelog SQLite (`change-log.ts`) is a per-process file. In a multi-container deployment each worker instance writes to its own local file, so there is no unified audit log.

**Impact**: Observability only — no correctness impact. Querying the full pipeline history requires collecting logs from each container.

**Fix options**:
- Write changelog entries to a shared volume (follows from fix #1)
- Replace with a structured logging sink (e.g., stdout JSON → log aggregator)
- Accept as-is if single-replica-per-type constraint is in place

**Files affected**: `packages/datapipe/orchestration/change-log.ts`, `packages/datapipe/orchestration/cli.ts`

---

## Priority Order

| # | Concern | Severity | Blocker for scale-out? |
|---|---------|----------|----------------------|
| 1 | Row store isolation | Critical | Yes |
| 2 | Local DLQ redrive | Medium | No (dev-only) |
| 3 | Changelog fragmentation | Low | No |

Concern #1 must be resolved before running more than one replica of any worker type. Concerns #2 and #3 are quality-of-life improvements.

# SQL contract tests

This package keeps raw SQL in `packages/server/database/queries/*.sql` and runs it
through `db.prepare<Result, Params>(sql)`. We keep raw SQL on purpose — each query is
portable and can be run and inspected outside the app. The price is that the `Result`
type is **a claim nobody checks**: `prepare<Result>()` is an _unchecked cast_. Bun runs
the SQL, gets whatever columns SQLite returns, and simply tells the compiler they are
`Result`.

So TypeScript only guards one seam:

```
SQL  ──(unchecked cast)──►  Result type  ──(tsc checks this)──►  consumer code
        ↑ nothing checks here              ↑ compiler guards here
```

The compiler catches drift between the **type and the code that reads it**. It never
catches drift between the **SQL and the type**. These tests close that second seam.
**The tests — not the types — are the guarantee.**

## The four layers

| Layer                | File                                                    | Guards                                                          |
| -------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| 1. Shape snapshots   | `sql-contract.test.ts` + `sql-snapshots/`               | A query's output column set / types / nullability changed       |
| 2. Type binding      | `sql-contract.test-d.ts` + `sql-type-registry.ts`       | A result type promises a column the SQL doesn't produce         |
| 3. Edge fixtures     | `helpers/setup-db.ts` (`seedEdgeCases`) + builder tests | Null/empty/boundary rows are tolerated, not just the happy path |
| 4. Golden API shapes | `api-response-shapes.test.ts`                           | An outward-facing `/api/*` JSON contract changed                |

### 1. Shape snapshots — does the SQL still return what we think?

`sql-contract.test.ts` runs every runtime-used query (enumerated by
`collectServerQueryAudit()` in `database/query-audit.ts`) against a seeded in-memory DB
and records its shape: `{ columns: name→typeof, hasNulls, rowCount }`. The shape is
stored **one file per query** in `sql-snapshots/<QUERY>.sql.json` (e.g.
`SESSIONS_PAGINATED.sql.json`) so diffs stay localized and there are no merge conflicts
on a single giant file.

On a normal run the recorded shape is compared to the live one and the test fails if
columns are added/removed/renamed, a type changes, or a column becomes newly nullable.

### 2. Type binding — does the TS type still match the SQL?

The snapshot proves _SQL == snapshot_, but the hand-written `DatabaseQueries.*` /
`DatabaseTables.*` types could still drift from it. For **purpose-built query-result
types**, `sql-type-registry.ts` declares the exact promised columns in
`TYPE_COLUMN_CONTRACTS`, and:

- `sql-contract.test-d.ts` asserts **at compile time** that `keyof Type` equals the
  contract (fails `tsc` if the type adds/drops a key);
- `sql-contract.test.ts` asserts **at runtime** that every contract column is actually
  produced by the SQL.

Chain of trust: `keyof Type == contract ⊆ actual SQL columns` ⇒ the type cannot promise
a column the SQL doesn't return. (This is exactly how the `GetParliamentComposition`
type was caught declaring `start_date`/`end_date` when the SQL emits
`t_start_date`/`t_end_date`.)

Bare `DatabaseTables.*` types are intentionally **not** bound — their queries project a
subset/superset of the table (e.g. an added joined `term_end_date`), so a strict key
contract doesn't apply. They're covered by the snapshot only.

### 3. Edge fixtures — is the null path actually exercised?

Snapshots only catch what the **seed data** produces. A `LEFT JOIN` column that is
non-null in the seed but null in production is the classic silent bug. Two defenses:

- `seedEdgeCases(db)` in `helpers/setup-db.ts` adds the awkward rows the happy-path
  `seedFullDataset` omits (a sitting MP with no district/votes/committee, a voting with
  `n_total = 0`, …). Extend it when you find a new null-producing case.
- The **view-model builder tests** in
  `packages/webapp/__tests__/view-model-edge-cases.test.ts` feed all-null/empty rows
  through the pure builders and assert the `?? fallback` logic holds (no throw, no
  `NaN`). This protects the rendered page — the layer that actually matters.

### 4. Golden API shapes — did an outward contract change?

`api-response-shapes.test.ts` runs the **real repositories + route handlers** against
the seeded DB and asserts the exact JSON key set of the `/api/*` endpoints. When a
change alters an endpoint's shape, the matching golden breaks, forcing the change (and
its external-consumer impact) to be deliberate rather than silent.

## Commands

```bash
bun test packages/server/__tests__/sql-contract.test.ts   # run the contract suite
bun run typecheck                                          # runs the .test-d.ts binding
bun run test:update-snapshots                              # rewrite shapes in place (+ prune stale)
bun run test:reset-snapshots                               # wipe sql-snapshots/ and rebuild from scratch
```

- **update** — everyday loop: you changed a query or the seed, refresh the affected
  shape files. Rewrites current shapes and prunes files no longer in the runtime set.
- **reset** — after larger restructuring (query renames, seed overhauls): deletes the
  whole `sql-snapshots/` directory and regenerates, guaranteeing no stale residue.

A `.test-d.ts` file is type-only and never executed; it is checked by `bun run
typecheck`, not by `bun test`.

## How to…

**Add / change a query.** Edit the `.sql`, run `bun run test:update-snapshots`, review
the changed `sql-snapshots/<QUERY>.sql.json` in your diff, and confirm `bun run
typecheck` + `bun test` are green. If the query returns 0 rows on the seed it gets no
snapshot — see "0-row queries" below.

**Register a result type for binding.** Add the query→type mapping to
`SQL_TYPE_REGISTRY`. If the type is a purpose-built query-result type, also add its
column list to `TYPE_COLUMN_CONTRACTS` and an assertion in `sql-contract.test-d.ts`.
The literal column list is the single source of truth, bound to the type (compile time)
and the SQL (runtime).

**A query returns 0 rows on the seed.** First check it's a binding mismatch, not missing
data: the generic bindings use `DEFAULT_BINDINGS` and fall back to `1` for unknown
params, which over-filters (e.g. a search term that matches no seeded row, or
`$session = 1`). Add a `QUERY_BINDING_OVERRIDES` entry in `sql-contract.test.ts`. If the
data is genuinely missing, add it to `seedFullDataset`.

**Add a null/boundary case.** Add the row to `seedEdgeCases` and pair it with an
assertion (a builder edge test, or a repository-method test) that proves the null is
handled — an unused fixture row is decoration.

## Residual risk (read this)

Because `prepare<>` is an unchecked cast, **these tests only catch what the seed
fixtures exercise.** A shape/nullability case the fixtures never produce can still drift
silently. Treat the seed (`seedFullDataset` + `seedEdgeCases`) as a first-class
contract: when you add a query or discover a production null, add the row and an
assertion. Coverage is partial by design — queries that return 0 rows on the seed have
no shape snapshot; the coverage summary is logged on each run
(`N/164 runtime queries have column snapshots`).

## Why not codegen / a query builder / runtime validation?

- **Result-type codegen** on SQLite is only partly trustworthy — dynamic typing,
  computed columns (`SUM(CASE…)`), and `LEFT JOIN` nullability mean the generated types
  manufacture false confidence for a generated-file + staleness tax. Tests on real
  seeded data are more honest.
- **Kysely/Drizzle or Zod** would close more statically / at runtime, but both sacrifice
  the raw-SQL portability we deliberately keep. Noted as long-term alternatives only.

## File map

```
packages/server/
  database/
    queries/*.sql                         raw SQL (the source of truth)
    query-audit.ts                        enumerates runtime-used queries
    sql-type-registry.ts                  SQL_TYPE_REGISTRY + TYPE_COLUMN_CONTRACTS
  __tests__/
    sql-contract.test.ts                  runtime: shape snapshots + contract columns
    sql-contract.test-d.ts                compile-time: keyof Type == contract
    sql-snapshots/<QUERY>.sql.json        per-query shape snapshots
    api-response-shapes.test.ts           golden /api/* JSON shapes
    helpers/setup-db.ts                   createTestDb, seedFullDataset, seedEdgeCases
packages/webapp/
  __tests__/view-model-edge-cases.test.ts builder null/edge tolerance
```

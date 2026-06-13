# Data Traceability (Tietolähteet)

How every figure shown in the web app can be traced back to the exact source
record in the Eduskunta open-data API it came from.

> This is the **living documentation** of the implemented feature. The original
> design notes live in `traceability-plan.md` (history only).

## The chain

```
Displayed figure
  └─ final DB row(s)            (e.g. Voting.id = 56634)
       └─ raw API record         (SaliDBAanestys, AanestysId = 56634)
            └─ scrape timestamp + per-record API URL
```

Two databases are involved:

| DB    | File                           | Holds                                 |
| ----- | ------------------------------ | ------------------------------------- |
| Main  | `avoimempi-eduskunta.db`       | The normalised schema the app queries |
| Trace | `avoimempi-eduskunta-trace.db` | One reference row per raw API record  |

The trace DB is **separate, read-only at runtime, and rebuilt by the pipeline**.
Path comes from `getTraceDatabasePath()` (`TRACE_DB_PATH` env override).

---

## 1. Tracking & saving (the pipeline)

### 1a. Scrape — capture _when_ a record was fetched

`packages/datapipe/scraper/scraper.ts` upserts each API row into the raw row
store. The store (`packages/shared/storage/row-store/providers/sqlite.ts`)
stamps `created_at = Date.now()` **only on first insert** (preserved on later
updates). That `created_at` is the scrape timestamp.

> ⚠️ `created_at` was added with `DEFAULT 0`, so rows scraped before it existed
> read back as epoch (`1970-01-01`). These are treated as "unknown" downstream.

### 1b. Migrate — derive the final schema

The migrators in `packages/datapipe/migrator/fn/*.ts` transform raw rows into the
final tables. Crucially, for almost every table **the final primary key is the
same value as the raw API primary key** (see §3) — this is what makes row-level
trace possible without storing extra lineage columns.

### 1c. Rebuild the trace DB

At the end of migration (`migrate.ts:670` → `rebuildTraceDatabase()` in
`packages/datapipe/migrator/trace-db.ts`):

- iterates **every raw row** of **every raw table** from the row store, and
- writes one row into `ImportSourceReference`:

```sql
ImportSourceReference (
  id, source_table, source_page, source_pk_name,
  source_pk_value, scraped_at, migrated_at
)
```

- `source_pk_name` — the raw API pk column (from the raw store column schema, e.g. `AanestysId`)
- `source_pk_value` — that row's pk value (string)
- `scraped_at` — the raw row's `created_at`, ISO; epoch/unknown stored as `NULL` (`validIso()`)
- `migrated_at` — timestamp of this rebuild

Then it aggregates `ImportSourceReferenceSummary` (per source table: row count,
first/last `scraped_at`, first/last `migrated_at`) for dataset-level fallbacks.

There is **no** per-final-row lineage table — see §3 for why it isn't needed.

### Current coverage (live data)

- `ImportSourceReference`: **9,928,187** rows — **100%** have `source_*` + `migrated_at`.
- `scraped_at`: **~1.3%** populated today (the rest pre-date `created_at` tracking
  and grow as rows are re-scraped/change).
- `ImportSourceReferenceSummary`: 13 source tables.

---

## 2. Resolving a figure at request time (the server)

The web app holds **final** tables; the trace DB is keyed by **raw** tables.
The bridge is resolved live (no materialised join), via three pieces:

### 2a. `SOURCE_LINEAGE` — the backbone registry

`packages/shared/constants/SourceLineage.ts` maps each final table to its source:

```ts
SourceRule { sourceTable; sourcePkName?; sourcePkColumn? }
```

- `sourcePkName` + `sourcePkColumn` set ⇒ **row-level** traceable. `sourcePkColumn`
  is the final-table column whose value equals the raw `source_pk_value`
  (the PK for SaliDB tables; `vaski_document_id` for documents).
- `sourceTable` only ⇒ **dataset-level** (lookup / child / aggregate tables).

Ground truth = the migrator `fn/*.ts`. Update this registry when a migrator
changes what it writes; the contract test (§4) fails on an unmapped table.

### 2b. `query-provenance` — what each SQL query reads

`packages/server/src/database/query-provenance.ts` lexically parses every
feature `*.sql` (`FROM`/`JOIN`, stripping comments/strings/CTEs/table-functions
and expanding the 2 views), then maps those final tables → source datasets via
`SOURCE_LINEAGE`. `getQuerySources()` caches `queryFile → { tables, sources }`.
This is how a query/view generates its full source trace automatically.

### 2c. `ProvenanceService` — produces the trace data

`packages/server/src/domain/provenance.service.ts`:

| Method                              | Use                              | Result                                                                        |
| ----------------------------------- | -------------------------------- | ----------------------------------------------------------------------------- |
| `forRow(finalTable, idValue, opts)` | a figure tied to one record      | row-level: real `scraped_at` + per-record **URL** via `ImportSourceReference` |
| `forQuery(queryFile, opts)`         | a figure from a whole query/view | dataset-level source set, parsed from the SQL                                 |
| `sourceNoteForQuery(queryFile)`     | a section footer                 | dataset note for that query                                                   |
| `forRow`/`forQuery` fall back       | trace DB missing/sparse          | dataset summary, else render time                                             |

`forRow` builds the per-record URL deterministically:

```
https://avoindata.eduskunta.fi/api/v1/tables/{sourceTable}/batch?pkName={pkName}&pkStartValue={id}&perPage=1
```

Wiring: `packages/server/index.ts` opens the trace DB read-only
(`openTraceDb()`), builds `TraceRepository` + `ProvenanceService`, and injects it
into the feature services. If the trace DB is absent it logs a warning and
everything degrades to render-time timestamps.

`TraceRepository` (`packages/server/src/database/trace.repository.ts`) does the
two lookups: `getProvenance(table, pkName, value)` (row) and `getSummary(table)`
(dataset).

---

## 3. Why no materialised lineage table

For every SaliDB table the final PK equals the raw API PK, and VaskiData docs
bridge via `vaski_document_id == VaskiData.Id` (all verified against live DBs):

```
Voting.id            == SaliDBAanestys.AanestysId
Vote.id              == SaliDBAanestysEdustaja.EdustajaId
Representative.person_id == MemberOfParliament.personId
Session/Section/Speech.id == SaliDB{Istunto,Kohta,Puheenvuoro}.Id
GovernmentProposal (etc.).vaski_document_id == VaskiData.Id
```

So `forRow` resolves directly against the existing `ImportSourceReference`. A
materialised `(final_table, final_pk) → source` table was rejected: it would
roughly double the 1.9 GB trace DB (8.6 M `Vote` rows) for fully-derivable data
whose `scraped_at` is mostly unknown anyway.

---

## 4. The UI layer

Server-rendered, no client data fetching:

- `cite(innerHtml, citeProps)` / `sourceNote(opts)` —
  `packages/server/src/components/provenance.tsx` — render a `<span class="cite">`
  with `data-*` attributes (set, table, endpoint, record, fetched, chain, **url**).
- `packages/server/src/client/trace-island.tsx` — one popover for all `.cite`
  marks; shows the chain, fields, freshness, and an "Avaa alkuperäinen ↗" link
  (the per-record `url`). Re-initialised on every htmx swap.

Converted so far: voting detail page (full row-level via `forRow("Voting", id)`)
and person profile footers (`sourceNoteForQuery`). Remaining session / document /
party / debate views are the same mechanical swap.

---

## 5. How to add tracing to a figure / new table

1. **New final table?** Add an entry to `SOURCE_LINEAGE`. Set
   `sourcePkName` + `sourcePkColumn` only if a final-row column equals the raw PK
   (then it's row-level traceable); otherwise just `sourceTable`.
2. **A single-record figure** (detail page): in the view model call
   `provenanceService.forRow(finalTable, idValue, { value, caption, label })`,
   store the `CitePropData`, render with `cite(html, data.provenance)`.
3. **A query-backed figure / footer**: call
   `provenanceService.forQuery("the-query.sql", …)` or
   `sourceNoteForQuery("the-query.sql")`.
4. Run tests — `__tests__/query-provenance.test.ts` fails if any query reads a
   table missing from `SOURCE_LINEAGE`, and checks every source table has
   `TABLE_META` (display name + endpoint, in `provenance.ts`).

---

## 6. Limitations

- **Scrape-timestamp coverage is low today (~1.3%)** and improves only as rows are
  re-scraped. To backfill fully, re-scrape so the raw store stamps `created_at`.
- `source_page` is always `NULL` (the raw store doesn't keep batch page numbers).
- Aggregate tables (`VotingPartyStats`, `Person*DailyStats`) are dataset-level only.
- Row-level applies to the tables flagged in `SOURCE_LINEAGE`; lookup/child tables
  contribute to a query's source set but expose no per-record URL.

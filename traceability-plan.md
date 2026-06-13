# Data Traceability Plan

## Goal

Replace hardcoded provenance strings in templates with a **data-driven traceability system** where every displayed figure traces back to its source DB row(s), which trace back to the API call(s) that fetched them, with real scrape timestamps. This is the defining product principle from the design spec.

## Core Chain

```
Displayed figure ⟶ DB row(s) (table + PK) ⟶ API call(s) (endpoint + page) ⟶ scrape timestamp
```

Every `<span class="cite">` carries this chain in its `data-*` attributes.
For multi-source figures (e.g. aggregate across tables), the chain fans out to multiple parallel paths.

## Current Problems

1. **Hardcoded strings.** Every `cite()` call manually passes `set`, `table`, `record`, `fetched`, `chain` — string literals in templates.
2. **Trace DB disconnected.** The webapp never reads the trace DB (`avoimempi-eduskunta-trace.db`); it's only built during migration.
3. **`source_page` always NULL.** The trace-db.ts INSERT hardcodes NULL.
4. **`scraped_at` often epoch zero.** Many rows show `1970-01-01T00:00:00.000Z` because the row store's `created_at` was never set (`DEFAULT 0`).
5. **`fetchedAt()` is synthetic.** `new Date().toLocaleString(...)` gives page-render time, not actual scrape time.
6. **No API-call tracking.** There's no record of which API batch produced which rows.
7. **No record-level URLs.** `data-url` rarely populated, so users can't "avoi alkuperäinen".

## Phase 1: Fix and Extend the Trace DB (Pipeline)

### Files
- `packages/datapipe/migrator/trace-db.ts`
- (optional) `packages/datapipe/scraper/` — add batch metadata tracking

### 1a. Fix `scraped_at`

Skip epoch-zero timestamps from the row store:

```typescript
function validIso(ts: string | null | undefined): string | null {
  if (!ts) return null;
  if (ts.startsWith("1970")) return null; // DEFAULT 0 = unknown
  return ts;
}
```

### 1b. Fix `source_page`

The row store (`StoredRow`) has no page number field. Two options:

**Option A (static lookup — simpler):** Leave `source_page` as-inferred from batch metadata. Use a static endpoint URL mapping in the webapp (deterministic from table name). The page number is less critical than the endpoint URL and timestamp.

**Option B (scraper-side logging — more complete):** Add a `scrape_batches` metadata table that the scraper writes to per API call:

```typescript
interface ScrapeBatchLog {
  tableName: string;
  pkStartValue: number;
  pageNumber: number;
  endpointUrl: string;     // e.g. "GET /api/v1/tables/Vote/batch?pkStartValue=0"
  rowCount: number;
  scrapedAt: string;       // ISO timestamp
}
```

Then `rebuildTraceDatabase()` reads this log to populate `source_page` and link to a new endpoint table.

### 1c. New Schema: API Call Tracking

```sql
CREATE TABLE IF NOT EXISTS ImportSourceEndpoint (
  id INTEGER PRIMARY KEY,
  source_table TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  page_number INTEGER,
  pk_start_value INTEGER,
  row_count INTEGER,
  scraped_at TEXT NOT NULL
);

-- Link each row reference to its source endpoint
ALTER TABLE ImportSourceReference ADD COLUMN source_endpoint_id
  INTEGER REFERENCES ImportSourceEndpoint(id);

CREATE INDEX IF NOT EXISTS idx_isr_endpoint
  ON ImportSourceReference(source_endpoint_id);
```

This enables the full chain: row → endpoint → timestamp.

## Phase 2: Provenance Types (packages/server/src/domain/)

### New file: `packages/server/src/domain/provenance.ts`

```typescript
// ==== A single source row ====
export interface ProvenanceSource {
  table: string;                // e.g. "Vote"
  pkName?: string;              // e.g. "PersonId"
  pkValue?: string | number;    // e.g. 467
  label?: string;               // human-readable record label, e.g. "Hoskonen, Hannu"
}

// ==== Pre-formatted provenance for a displayed figure ====
export interface ProvenanceInfo {
  sources: ProvenanceSource[];  // one or more (multi-source support)
  value?: string;               // headline figure for popover
  caption?: string;             // descriptive caption
  markText?: string;            // marker override ("∗" default)

  /** Build CiteProps ready for the cite() template helper */
  toCiteProps(): CiteProps;

  /** Build SourceNoteOptions for the sourceNote() footer */
  toSourceNoteOptions(fetchedAt?: string): SourceNoteOptions;
}
```

### Table → Display Name & Endpoint Mapping

```typescript
export const TABLE_META: Record<string, {
  displayName: string;
  endpoint: string;
}> = {
  "Vote":                  { displayName: "Eduskunnan avoin data · Vote",                endpoint: "GET /api/v1/tables/Vote/batch" },
  "SaliDBAanestys":        { displayName: "Eduskunnan avoin data · Vote",                endpoint: "GET /api/v1/tables/SaliDBAanestys/batch" },
  "SaliDBAanestysEdustaja":{ displayName: "Eduskunnan avoin data · Vote",               endpoint: "GET /api/v1/tables/SaliDBAanestysEdustaja/batch" },
  "MemberOfParliament":    { displayName: "Eduskunnan avoin data · MemberOfParliament",  endpoint: "GET /api/v1/tables/MemberOfParliament/batch" },
  "SaliDBIstunto":         { displayName: "Eduskunnan avoin data · Session",             endpoint: "GET /api/v1/tables/SaliDBIstunto/batch" },
  "SaliDBKohta":           { displayName: "Eduskunnan avoin data · Section",             endpoint: "GET /api/v1/tables/SaliDBKohta/batch" },
  "SaliDBPuheenvuoro":     { displayName: "Eduskunnan avoin data · Speech",              endpoint: "GET /api/v1/tables/SaliDBPuheenvuoro/batch" },
  "LegislativeInitiative": { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/LegislativeInitiative/batch" },
  "WrittenQuestion":       { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/WrittenQuestion/batch" },
  "OralQuestion":          { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/OralQuestion/batch" },
  "Interpellation":        { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/Interpellation/batch" },
  "GovernmentProposal":    { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/GovernmentProposal/batch" },
  "CommitteeReport":       { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/CommitteeReport/batch" },
  "ParliamentAnswer":      { displayName: "Eduskunnan avoin data · VaskiData",           endpoint: "GET /api/v1/tables/ParliamentAnswer/batch" },
  "Speech":                { displayName: "Eduskunnan avoin data · Speech",              endpoint: "GET /api/v1/tables/Speech/batch" },
  "Session":               { displayName: "Eduskunnan avoin data · Session",             endpoint: "GET /api/v1/tables/Session/batch" },
  "Committee":             { displayName: "Eduskunnan avoin data · Committee",           endpoint: "GET /api/v1/tables/Committee/batch" },
  "ParliamentaryGroup":    { displayName: "Eduskunnan avoin data · ParliamentaryGroup",  endpoint: "GET /api/v1/tables/ParliamentaryGroup/batch" },
  "Voting":                { displayName: "Eduskunnan avoin data · Vote",                 endpoint: "GET /api/v1/tables/Voting/batch" },
};
```

For multi-source figures, concatenate: `"Eduskunnan avoin data · Session + Vote + Speech"`.

### ProvenanceInfo.toCiteProps() Logic

```typescript
toCiteProps(): CiteProps {
  const traceRepo = getTraceRepo(); // injected singleton
  const sources = this.sources;
  const tables = [...new Set(sources.map(s => s.table))];
  const displayNames = tables.map(t => TABLE_META[t]?.displayName ?? t);
  const endpoints = tables.map(t => TABLE_META[t]?.endpoint ?? "");
  const lookups = sources.map(s => traceRepo.getProvenance(s.table, s.pkName ?? "", String(s.pkValue ?? "")));
  const timestamps = lookups.map(l => l?.scrapedAt).filter(Boolean);
  const earliest = timestamps.length ? timestamps.sort()[0] : null;

  return {
    value: this.value,
    caption: this.caption,
    set: displayNames.length > 1
      ? `Eduskunnan avoin data · ${displayNames.join(" + ")}`
      : displayNames[0],
    table: tables.join(", "),
    endpoint: endpoints.join(", "),
    record: sources.map(s => s.label ?? String(s.pkValue ?? "")).join("; "),
    fetched: earliest
      ? formatFiDateTime(earliest)  // from trace DB
      : fetchedAt(),                 // fallback: current time
    chain: [
      "avoindata.eduskunta.fi",
      ...tables,
      ...sources.map(s => `${s.pkName ?? ""}=${s.pkValue ?? ""}`),
    ].join(" > "),
    markText: this.markText,
  };
}
```

## Phase 3: Trace Repository (Server)

### New file: `packages/server/src/database/trace.repository.ts`

```typescript
export interface TraceRecord {
  sourceTable: string;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: string | null;
  scrapedAt: string | null;
  migratedAt: string;
  endpointUrl?: string;
}

export class TraceRepository {
  constructor(private traceDb: Database) {}

  /** Single-record lookup */
  getProvenance(table: string, pkName: string, pkValue: string): TraceRecord | null;

  /** Batch lookup for multi-source figures */
  getProvenances(
    sources: Array<{ table: string; pkName: string; pkValue: string }>,
  ): TraceRecord[];

  /** Table-level summary */
  getSummary(table: string): ImportSourceReferenceSummary | null;

  /** Scrape timestamp range for a set of sources */
  getScrapeRange(
    sources: Array<{ table: string; pkName: string; pkValue: string }>,
  ): { earliest: string | null; latest: string | null };
}
```

### Lookup SQL

```sql
SELECT isr.source_table, isr.source_page, isr.source_pk_name, isr.source_pk_value,
       isr.scraped_at, isr.migrated_at, ise.endpoint_url
FROM ImportSourceReference isr
LEFT JOIN ImportSourceEndpoint ise ON isr.source_endpoint_id = ise.id
WHERE isr.source_table = ? AND isr.source_pk_name = ? AND isr.source_pk_value = ?
LIMIT 1;
```

## Phase 4: ProvevanceService (Glue)

### New file: `packages/server/src/domain/provenance.service.ts`

```typescript
export class ProvenanceService {
  constructor(private traceRepo: TraceRepository) {}

  /** Build pre-formatted provenance from one or more source references */
  forSources(sources: ProvenanceSource[], opts?: {
    value?: string;
    caption?: string;
    markText?: string;
  }): ProvenanceInfo;

  /** Convenience for single-source figures */
  forTable(
    table: string,
    pkName: string,
    pkValue: string | number,
    opts?: { value?: string; caption?: string; markText?: string; label?: string },
  ): ProvenanceInfo;

  /** Build sourceNote from a ProvenanceInfo */
  sourceNote(info: ProvenanceInfo, fetchedAt?: string): SourceNoteOptions;
}
```

## Phase 5: Update View Models

Each view model that displays traced figures gets a `provenance` field with pre-formatted `ProvenanceInfo`:

```typescript
// In profile.view-model.ts
export interface PersonProfileData {
  // ...existing fields...
  provenance: {
    participation: ProvenanceInfo;
    votedNo: ProvenanceInfo;
    initiatives: ProvenanceInfo;
    writtenQuestions: ProvenanceInfo;
  };
}
```

The service layer builds these when constructing the view model:

```typescript
// In person.service.ts
const profile = buildPersonProfileData({
  // ...existing parameters...
  provenance: {
    participation: provenanceService.forTable("Vote", "PersonId", personId, {
      value: `${participationPct} % (${nCast} / ${nTotal})`,
      caption: t("persons:profile.participation_caption"),
    }),
    votedNo: provenanceService.forTable("Vote", "PersonId", personId, {
      value: t("persons:profile.voted_no_caption"),
      caption: t("persons:profile.voted_no_caption"),
    }),
    initiatives: provenanceService.forTable("LegislativeInitiative", "PersonId", personId, {
      value: t("persons:profile.initiatives_n", { count: nInitiatives }),
      caption: t("persons:profile.initiatives_caption"),
    }),
    // ...
  },
});
```

## Phase 6: Update Templates

Templates become much cleaner — they just call `toCiteProps()`:

```tsx
// BEFORE (hardcoded):
cite(`${s.participationPct}<small>%</small>`, {
  value: "83,3 % (108 / 128)",
  caption: "Äänestysaktiivisuus tarkasteluhetkellä",
  set: "Eduskunnan avoin data · Vote",
  table: "Vote",
  record: "annetut 128 · poissa 72",
  fetched: "...",
  chain: "avoindata.eduskunta.fi > Vote > Etusivu-kooste",
  markText: "*",
})

// AFTER (data-driven):
cite(`${s.participationPct}<small>%</small>`,
  data.provenance.participation.toCiteProps())
```

For multi-source `sourceNote`:

```tsx
// BEFORE:
sourceNote({
  dataset: "Eduskunnan avoin data · Session + Voting + Speech",
  fetchedAt: data.fetchedAt,
})

// AFTER:
sourceNote(data.provenance.sessionList.toSourceNoteOptions())
```

## Phase 7: Server Wiring

### `packages/server/index.ts`

```typescript
import { Database } from "bun:sqlite";
import { getDatabasePath, getTraceDatabasePath } from "#database";
import { TraceRepository } from "#server/database/trace.repository";
import { ProvenanceService } from "#server/domain/provenance.service";

const mainDb = Database.open(getDatabasePath());
let traceRepo: TraceRepository | null = null;
let provenanceService: ProvenanceService | null = null;

// Lazy-open trace DB (it's ~2GB, no need to load eagerly)
function getProvenanceService(): ProvenanceService {
  if (!provenanceService) {
    const traceDb = Database.open(getTraceDatabasePath());
    traceRepo = new TraceRepository(traceDb);
    provenanceService = new ProvenanceService(traceRepo);
  }
  return provenanceService;
}

// Inject into feature services:
const personService = new PersonService(
  new PersonRepository(mainDb),
  getProvenanceService,
);
```

### `packages/server/src/database/db.ts`

Export a helper to open the trace DB:

```typescript
export function openTraceDb(): Database {
  const db = Database.open(getTraceDatabasePath(), { readonly: true });
  db.run("PRAGMA journal_mode = WAL;");
  return db;
}
```

## File Change Summary

| Area | File | Change |
|---|---|---|
| Pipeline | `packages/datapipe/migrator/trace-db.ts` | Fix `scraped_at` (skip epoch zero), populate `source_page` from batch metadata, add `ImportSourceEndpoint` schema |
| Pipeline | `packages/datapipe/scraper/*.ts` (optional) | Add `scrape_batches` metadata log per API call |
| Server (new) | `packages/server/src/database/trace.repository.ts` | `TraceRepository` class — reads trace DB |
| Server (new) | `packages/server/src/domain/provenance.ts` | Types: `ProvenanceSource`, `ProvenanceInfo`, `TABLE_META` |
| Server (new) | `packages/server/src/domain/provenance.service.ts` | `ProvenanceService` — builds `ProvenanceInfo`, calls trace repo |
| Server | `packages/server/src/database/db.ts` | Export `openTraceDb()` helper |
| Server | `packages/server/index.ts` | Wire trace repo + provenance service (lazy) |
| Server | `packages/server/src/features/person/person.service.ts` | Build provenance info per field |
| Server | `packages/server/src/features/person/pages/profile.view-model.ts` | Add `provenance` field |
| Server | `packages/server/src/features/person/pages/profile.page.tsx` | Use `.toCiteProps()` |
| Server | `packages/server/src/features/session/session.service.ts` | Build provenance info |
| Server | Session view models + page templates | Use provenance service |
| Server | Voting feature | Build + use provenance |
| Server | Document feature | Build + use provenance |
| Server | Metadata (parties) feature | Build + use provenance |
| Server | Debate fragment | Build + use provenance |

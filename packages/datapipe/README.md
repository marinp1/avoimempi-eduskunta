# Eduskunta Data Pipeline

`packages/datapipe` contains the three ETL stages used to build the application database:

1. `scraper`: fetches source rows from Eduskunta Open API into `data/raw.db`
2. `parser`: transforms raw rows into normalized rows in `data/parsed.db`
3. `migrator`: imports parsed rows into `avoimempi-eduskunta.db`

## Pipeline flow

```mermaid
flowchart LR
  A[Eduskunta Open API] --> B[scraper]
  B --> C[data/raw.db]
  C --> D[parser]
  D --> E[data/parsed.db]
  E --> F[migrator]
  F --> G[avoimempi-eduskunta.db]
```

## Directory structure

```txt
packages/datapipe/
├── scraper/
│   ├── cli.ts
│   └── scraper.ts
├── parser/
│   ├── cli.ts
│   ├── parser.ts
│   └── fn/<TableName>.ts
├── orchestration/
│   ├── cli.ts
│   ├── contracts.ts
│   ├── adapters/sqs.ts
│   └── handlers/*.ts
└── migrator/
    ├── cli.ts
    ├── migrations/V*.sql
    └── <TableName>/migrator.ts
```

## Running commands

From repository root:

```bash
bun run scrape <TableName>
bun run parse <TableName>
bun run migrate
bun run pipeline:bootstrap
bun run pipeline:inspect
bun run pipeline:worker:inspect
bun run pipeline:worker:scrape
bun run pipeline:worker:parse
```

Equivalent direct commands from `packages/datapipe`:

```bash
bun run scraper/cli.ts <TableName>
bun run parser/cli.ts <TableName>
bun run migrator/cli.ts start
bun run orchestration/cli.ts bootstrap
bun run orchestration/cli.ts inspect all
bun run orchestration/cli.ts worker inspect
bun run orchestration/cli.ts worker scrape
bun run orchestration/cli.ts worker parse
```

## Stage details

### 1) Scraper

Reads table columns and paginated batches from:

- `https://avoindata.eduskunta.fi/api/v1/tables/<TableName>/columns`
- `https://avoindata.eduskunta.fi/api/v1/tables/<TableName>/batch`

Writes to row-store `data/raw.db` using PK-based upserts and resume logic.

Common commands:

```bash
# auto-resume
bun run scrape MemberOfParliament

# start from PK
bun run scrape MemberOfParliament --from-pk 500

# scrape inclusive PK range
bun run scrape MemberOfParliament --from-pk 82000 --to-pk 83000

# refresh one PK
bun run scrape MemberOfParliament --single-pk 82310

# patch from PK (patch page + one follow-up page)
bun run scrape MemberOfParliament --patch-pk 82310

# status
bun run scrape status
```

Notes:

- default batch size is up to 100 rows per request
- auto-resume continues from max stored PK for the table
- gap repair is attempted automatically in auto-resume/full runs

### 2) Parser

Reads rows from `data/raw.db`, reconstructs typed row objects from stored column schema, applies optional custom parser logic, then writes to `data/parsed.db`.

Common commands:

```bash
# parse one table
bun run parse MemberOfParliament

# parse all known tables
bun run parse all

# force re-parse (ignore hash-based skip)
bun run parse MemberOfParliament --force

# parse PK range
bun run parse MemberOfParliament --pk-start 82000 --pk-end 83000

# status
bun run parse status
```

Custom parser modules:

- location: `packages/datapipe/parser/fn/<TableName>.ts`
- default export: async parser function `(row, primaryKey) => [id, transformedRow]`

### 3) Migrator

Rebuilds/imports the app database from parsed rows.

Core behavior:

- opens/creates target DB (`avoimempi-eduskunta.db`)
- applies SQL migrations from `packages/datapipe/migrator/migrations`
- clears import target tables
- imports tables in dependency-aware order via table migrators
- updates migration metadata
- writes import trace/source-reference data (`avoimempi-eduskunta-trace.db`)
- publishes latest SQLite artifact metadata to storage

Common commands:

```bash
# default (same as "start")
bun run migrate

# explicit
bun run migrate start

# status
bun run migrate status

# fresh recreate (deletes DB files first, then imports)
bun run migrate:fresh
```

### Queue orchestration (inspector -> scraper -> parser)

Use orchestration when you want structured reprocessing via queues:

1. `inspector` compares API row counts and current raw store state, then queues targeted scrape tasks (gap ranges + tail continuation).
2. `scraper` consumes scrape tasks and queues parse tasks for the same PK scope.
3. `parser` consumes parse tasks and writes upsert-range logs to `ParsedUpsertLog` (SQLite) for migrator preparation.
4. `migrator` remains a separate process.

Prerequisite:

```bash
bun add @aws-sdk/client-sqs
```

Commands:

```bash
# 1) Bootstrap queues in ElasticMQ
bun run pipeline:bootstrap

# 2) Enqueue inspect tasks
bun run pipeline:inspect
# or single table:
cd packages/datapipe && bun run orchestration/cli.ts inspect MemberOfParliament

# 3) Start workers (separate terminals/processes)
bun run pipeline:worker:inspect
bun run pipeline:worker:scrape
bun run pipeline:worker:parse
```

Parser upsert logs are stored by default in `data/pipeline-orchestration.db` table `ParsedUpsertLog`.

## End-to-end examples

Single table:

```bash
bun run scrape MemberOfParliament
bun run parse MemberOfParliament
bun run migrate
```

Targeted repair:

```bash
bun run scrape MemberOfParliament --from-pk 82000 --to-pk 83000
bun run parse MemberOfParliament --pk-start 82000 --pk-end 83000
bun run migrate
```

## Configuration

Key environment variables:

- `ROW_STORE_DIR`: directory containing `raw.db` and `parsed.db`
- `STORAGE_LOCAL_DIR`: fallback base dir used when `ROW_STORE_DIR` is not set
- `DB_PATH`: override final app DB path
- `TRACE_DB_PATH`: override trace DB path
- `MIGRATOR_*`: migration tuning and reporting flags (see root `.env.example`)

## See also

- Root overview: `../../README.md`
- Parser details: `./parser/README.md`
- Shared storage docs: `../shared/storage/README.md`

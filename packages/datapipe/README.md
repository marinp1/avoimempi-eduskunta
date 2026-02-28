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
```

Equivalent direct commands from `packages/datapipe`:

```bash
bun run scraper/cli.ts <TableName>
bun run parser/cli.ts <TableName>
bun run migrator/cli.ts start
```

## Manual sync and rebuild runbook

Use this section when you want to manually run data refresh, parsing, and database rebuild from terminal.

### Full refresh

```bash
# scrape source rows
bun run scrape MemberOfParliament
# repeat per needed table

# parse normalized rows
bun run parse all

# rebuild app database
bun run migrate
```

### Targeted PK range repair

```bash
bun run scrape MemberOfParliament --from-pk 82000 --to-pk 83000
bun run parse MemberOfParliament --pk-start 82000 --pk-end 83000
bun run migrate
```

### Rebuild database only

Use this when `data/parsed.db` is already up to date and you only want to recreate the final DB files.

```bash
# rebuild in place
bun run migrate

# hard recreate (deletes DB files first)
bun run migrate:fresh
```

### Common checks

```bash
bun run scrape status
bun run parse status
bun run migrate status
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

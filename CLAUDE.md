# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avoimempi Eduskunta (More Open Parliament) is a data aggregation and analysis platform for Finnish Parliament (Eduskunta) data. The project fetches, parses, and imports data from the Eduskunta Open API into a normalized SQLite database, then serves it through an htmx-based web application.

## Technology Stack

- **Runtime**: Bun (required)
- **Language**: TypeScript with ESM modules
- **Database**: SQLite with WAL mode
- **Storage**: Offline-first storage abstraction (SQLite row stores + local filesystem)
- **Frontend**: htmx with CSS
- **Container**: Podman or Docker

## Workspace Structure

This is a Bun workspace monorepo with the following structure:

```
packages/
  server/      - Bun backend + htmx web app, feature-organized under src/features/
  datapipe/    - Data pipeline CLIs (node)
  shared/      - Code consumed by BOTH server and datapipe
  infra/       - Infrastructure-as-code (Terraform/OpenTofu)
```

The former `packages/client/` (React/MUI SPA) and `packages/webapp/` (early htmx
frontend) have been removed — the htmx frontend now lives inside `packages/server/`.

## Storage Architecture

The project uses offline-first, local storage:

1. **data/raw.db** - Raw API rows (created by the scraper via the row-store abstraction in `packages/shared/storage/row-store/`)
2. **data/parsed.db** - Parsed/transformed rows (created by the parser)
3. **avoimempi-eduskunta.db** - Final normalized SQLite schema (created by the migrator)

A generic key/value storage abstraction also exists in `packages/shared/storage/index.ts` (used for artifacts and metadata):

- `storage.put(key, data)` - Write data to storage
- `storage.get(key)` - Read data from storage
- `storage.list(prefix)` - List keys with prefix

## Common Commands

### Type Checking

```bash
# Check all workspaces
bun run typecheck

# Check specific workspace
cd packages/server && bun run typecheck
cd packages/datapipe && bun run typecheck
cd packages/shared && bun run typecheck
```

### Application Development

```bash
# Start the web application server (from root)
bun run start

# Or directly from server package
cd packages/server && bun run start
# Server runs with HMR in development mode
```

### Data Pipeline

The data pipeline follows this order: scrape → parse → migrate

**1. Scraping (fetch raw data from API)**

```bash
# From root
bun run scrape <TableName>

# Or directly from datapipe
cd packages/datapipe
bun run scrape <TableName>           # Scrape specific table
bun run scrape:status                # Check scraping status
```

**2. Parsing (transform raw data)**

```bash
# From root
bun run parse <TableName>

# Or directly from datapipe
cd packages/datapipe
bun run parse <TableName>            # Parse specific table
bun run parse:status                 # Check parsing status
```

**3. Migration (import to final schema)**

```bash
bun run migrate
```

## Key Architecture Patterns

### Data Pipeline Flow

Each table goes through a three-stage ETL process:

1. **Scraper** (`packages/datapipe/scraper/`):
   - Fetches paginated data from `https://avoindata.eduskunta.fi/api/v1/tables/{TableName}/batch`
   - Stores raw responses in `data/raw.db` using the row-store abstraction
   - Uses primary key-based pagination (`pkStartValue`)
   - Rate-limited with 25ms between requests; transient failures retried with backoff (`scraper/fetch-retry.ts`)
   - Controlled via `bun run scrape` CLI

2. **Parser** (`packages/datapipe/parser/`):
   - Reads from raw storage table by table
   - Applies custom parser functions from `fn/{TableName}.ts` if available
   - Falls back to default parser if no custom parser exists
   - Writes transformed data to `data/parsed.db`
   - Controlled via `bun run parse` CLI

3. **Migrator** (`packages/datapipe/migrator/`):
   - Uses `bun-sqlite-migrations` for schema management
   - Migrations stored in `packages/datapipe/migrator/migrations/`
   - Each table has a migrator function in `fn/{TableName}.ts` (registered in `table-migrators.ts`)
   - Imports occur in specific order (defined in `IMPORT_ORDER` in `migrate.ts`)
   - Clears all tables before importing to ensure clean state
   - Triggered via `bun run migrate` CLI

### Application Architecture

The web app is a single Bun package organized **by feature** (not by technical layer).
Data flows: Route → Service → Repository → View Model → Page/Fragment template.

- **packages/server/** - Bun HTTP server + htmx frontend
  - `index.ts` - Main server: constructs repositories + services and registers routes
  - `routes/webapp/` - Thin route handlers (validate input, dispatch to a service)
  - `src/features/<name>/` - One module per screen (`home`, `person`, `voting`,
    `session`, `document`, `analytics`, `metadata`). Each contains:
    - `<name>.service.ts` - orchestration + business rules; produces view models
    - `<name>.repository.ts` - database access only (returns raw rows)
    - `sql/*.sql` - raw SQL, co-located with the feature
    - `pages/*.page.tsx` + `pages/*.view-model.ts` - full-page templates + view models
    - `fragments/*.fragment.tsx` - independently htmx-swappable regions
  - `src/database/` - DB connection, launch, query helpers, SQL type registry + audit
  - `src/components/`, `src/layouts/` - shared UI components and layout partials
  - `src/client/` - browser assets (styles, htmx config, JS islands)
  - `src/domain/`, `src/helpers/`, `src/i18n.ts`, `src/locales/` - server-only logic + i18n
  - `public/` - static assets and HTML entry point

- **packages/shared/** - Code consumed by BOTH `server` and `datapipe`
  - `constants/` - Table names, primary keys, etc.
  - `database/` - Database path utilities
  - `storage/` - Storage abstraction layer
  - `typings/` - Shared ambient TypeScript types (SQL/raw-data model, rich text)

### Path Aliasing

TypeScript path aliases are configured in the root `tsconfig.json`:

- `#constants` → `packages/shared/constants/index.ts`
- `#database` → `packages/shared/database/index.ts`
- `#storage` → `packages/shared/storage/index.ts`
- `#table-counts` → `packages/datapipe/table-counts/index.ts`
- `#shared/*` → `packages/shared/*`
- `#server/*` → `packages/server/src/*`

Check the root `tsconfig.json` for the full list.

### Table Names and Constants

All supported table names (`TableNames`) and per-table primary keys (`PrimaryKeys`) are defined in `packages/shared/constants/index.ts`.

Common tables:

- `MemberOfParliament` - Representative data
- `SaliDBAanestys` - Voting sessions
- `SaliDBAanestysEdustaja` - Individual votes by representatives
- `SaliDBIstunto` - Parliamentary sessions
- `SaliDBKohta` - Agenda items

## Development Notes

### HTML Escaping in Templates (server JSX)

The custom JSX runtime (`packages/server/src/jsx/jsx-runtime.ts`) **escapes by
default**: plain-string children and attribute values are HTML-escaped
automatically. Do NOT call `esc()` inside JSX expressions — that double-escapes.

- Nested JSX elements and function-component return values are trusted
  (wrapped in `SafeHtml`) and compose without double-escaping.
- To inject pre-built raw HTML (e.g. from an HTML-builder helper), wrap it
  with `trustedHtml(...)` from `#server/jsx/jsx-runtime` — never wrap request-
  or API-derived data directly.
- `esc()` (`#server/helpers/template-helpers`) is still needed when assembling
  raw HTML strings via template literals outside JSX (e.g. route-level
  not-found fragments).
- `dangerouslySetInnerHTML={{ __html }}` is supported for trusted HTML such as
  translation strings containing markup.

### Adding Support for a New Table

1. Ensure table name exists in `packages/shared/constants/index.ts` (`TableNameMap` + `PrimaryKeys`)
2. (Optional) Create custom parser: `packages/datapipe/parser/fn/{TableName}.ts`
3. Create migrator: `packages/datapipe/migrator/fn/{TableName}.ts` and register it in `packages/datapipe/migrator/table-migrators.ts`
4. Add migration SQL if needed: `packages/datapipe/migrator/migrations/V*.sql` (and register the filename in `packages/datapipe/__tests__/migrations-schema.test.ts`)
5. Update `IMPORT_ORDER` in `packages/datapipe/migrator/migrate.ts` if dependencies exist
6. Run the pipeline: `bun run scrape <TableName>` → `bun run parse <TableName>` → `bun run migrate`

### Migration File Best Practices

**IMPORTANT**: SQL migration files (`packages/datapipe/migrator/migrations/V*.sql`) must follow these rules:

1. **No inline comments** - Comments on the same line as SQL statements break the migration parser
2. **One statement per line** - Each SQL statement should be on its own line(s)
3. **Separate statements with blank lines** - Improves readability and ensures proper parsing

**Good Example:**

```sql
ALTER TABLE Term ADD COLUMN start_year INTEGER;

ALTER TABLE Term ADD COLUMN end_year INTEGER;

CREATE INDEX idx_term_start_year ON Term(start_year);
```

**Bad Example (will fail):**

```sql
-- Add year columns to Term table
ALTER TABLE Term ADD COLUMN start_year INTEGER;  -- For optimization
ALTER TABLE Term ADD COLUMN end_year INTEGER;
```

The migration system splits SQL files by semicolons and executes each statement individually. Comments on the same line as code or empty statements will cause "Query contained no valid SQL statement" errors.

### SQLite WAL Mode

All database connections use `PRAGMA journal_mode = WAL;` for better concurrency and performance. This is critical for the application to work correctly.

### Module System

All packages use ESM modules (`"type": "module"` in package.json). Import statements must include file extensions in some contexts. TypeScript is configured with `"module": "preserve"` and `"allowImportingTsExtensions": true`.

### Storage Abstraction

The storage layer is designed to be cloud-agnostic and offline-first:

- Current implementation uses local filesystem (`LocalFilesystemStorage`)
- Can be swapped for S3, Azure Blob, etc. by implementing the `Storage` interface
- All datapipe operations go through the storage abstraction

### Error Handling in Scraper

The scraper has a safety limit (`MAX_LOOP_LIMIT = 10_000`) to prevent infinite loops. If this limit is reached, it throws a "Sanity check error". This can be adjusted for large tables.

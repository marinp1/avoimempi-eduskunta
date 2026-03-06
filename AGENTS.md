# AGENTS.md

This file provides guidance to Codex when working with code in this repository.

## Project Overview

Avoimempi Eduskunta (More Open Parliament) is a data aggregation and analysis platform for Finnish Parliament (Eduskunta) data. The project fetches, parses, and imports data from the Eduskunta Open API into a normalized SQLite database, then serves it through a React-based web application.

## Issues

Issues are tracked locally in .issues folder.

## Technology Stack

- **Runtime**: Bun v1.2.2 (required)
- **Language**: TypeScript with ESM modules
- **Database**: SQLite with WAL mode
- **Storage**: Offline-first storage abstraction (JSON files on local filesystem)
- **Frontend**: React 19 with Material-UI (MUI) and Emotion styling
- **Container**: Podman or Docker

## Workspace Structure

This is a Bun workspace monorepo with the following structure:

```
packages/
  client/      - React frontend (browser)
  server/      - Bun backend API (node)
  datapipe/    - Data pipeline CLIs (node)
  shared/      - Shared types & utilities
```

## Storage Architecture

The project uses an offline-first storage abstraction that writes to local filesystem:

1. **data/raw/{TableName}/page_*.json** - Raw API responses (created by scraper)
2. **data/parsed/{TableName}/page_*.json** - Parsed/transformed data (created by parser)
3. **avoimempi-eduskunta.db** - Final normalized SQLite schema (created by migrator)

Storage abstraction is managed through `packages/shared/storage/index.ts` which provides:
- `storage.put(key, data)` - Write data to storage
- `storage.get(key)` - Read data from storage
- `storage.list(prefix)` - List keys with prefix

## Common Commands

### Type Checking
```bash
# Check all workspaces
bun run typecheck

# Check specific workspace
cd packages/client && bun run typecheck
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
   - Rate-limited with 10ms between requests
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
   - Each table has a migrator function in `{TableName}/migrator.ts`
   - Imports occur in specific order (defined in `IMPORT_ORDER`)
   - Clears all tables before importing to ensure clean state
   - Triggered via `bun run migrate` CLI

### Application Architecture

The web application is split into clear client/server separation:

- **packages/server/** - Bun HTTP server
  - `index.ts` - Main server with type-safe routing
  - `database/` - Database access layer with `DatabaseConnection` class
  - `public/` - Static assets and HTML entry point

- **packages/client/** - React SPA
  - Pages: `Etusivu/`, `Edustajat/`, `Puolueet/`, `Istunnot/`, `Äänestykset/`, `Asiakirjat/`, `Analytiikka/`, `Muutokset/`
  - Entry point: `root.tsx` → `app.tsx`
  - Material-UI components with Emotion styling

- **packages/shared/** - Shared code
  - `constants/` - Table names, primary keys, etc.
  - `database/` - Database path utilities
  - `storage/` - Storage abstraction layer
  - `types/` - Shared TypeScript types

### Path Aliasing

TypeScript path aliases are configured per workspace. Common pattern:
- `#database` → `../shared/database/index.ts`
- `#constants` → `../shared/constants/index.ts`
- `#storage` → `../shared/storage/index.ts`

Check each workspace's `tsconfig.json` for specific path mappings.

### Table Names and Constants

All supported table names are defined in `packages/shared/constants/TableNames.ts`. Primary keys for each table are in `packages/shared/constants/PrimaryKeys.ts`.

Common tables:
- `MemberOfParliament` - Representative data
- `SaliDBAanestys` - Voting sessions
- `SaliDBAanestysEdustaja` - Individual votes by representatives
- `SaliDBIstunto` - Parliamentary sessions
- `SaliDBKohta` - Agenda items

## Development Notes

### Adding Support for a New Table

1. Ensure table name exists in `packages/shared/constants/TableNames.ts`
2. (Optional) Create custom parser: `packages/datapipe/parser/fn/{TableName}.ts`
3. Create migrator: `packages/datapipe/migrator/{TableName}/migrator.ts`
4. Add migration SQL if needed: `packages/datapipe/migrator/migrations/V*.sql`
5. Update `IMPORT_ORDER` in `packages/datapipe/migrator/import-data.ts` if dependencies exist
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


## Available Agents

Codex agents live in `.codex/agents/`:

- `parliament-domain-expert` - Finnish Parliament domain knowledge, data modeling, terminology, and analytics guidance.
- `senior-frontend-dev` - React/MUI/Emotion frontend implementation with mobile-first best practices.
- `sqlite-backend-engineer` - SQLite schema design, migrations, and query optimization.

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Avoimempi Eduskunta (More Open Parliament) is a data aggregation and analysis platform for Finnish Parliament (Eduskunta) data. The project fetches, parses, and imports data from the Eduskunta Open API into a normalized SQLite database, then serves it through a React-based web application.

## Technology Stack

- **Runtime**: Bun v1.2.2 (required)
- **Language**: TypeScript with ESM modules
- **Database**: SQLite with WAL mode
- **Frontend**: React 19 with Material-UI (MUI) and Emotion styling
- **Container**: Podman or Docker

## Workspace Structure

This is a Bun workspace monorepo with the following structure:

```
functions/
  scraper/     - Fetches raw data from Eduskunta API
  parser/      - Parses raw data into structured format
  migrator/    - Imports parsed data into final database schema
application/   - React web application with Bun server
shared/        - Shared constants, types, and utilities
```

## Database Architecture

The project uses three SQLite databases in a data pipeline:

1. **eduskunta-raw-data.db** - Raw API responses (created by scraper)
2. **eduskunta-parsed-data.db** - Parsed/transformed data (created by parser)
3. **avoimempi-eduskunta.db** - Final normalized schema (created by migrator)

Database paths are managed through `shared/database/index.ts` which exports:
- `getRawDatabasePath()`
- `getParsedDatabasePath()`
- `getDatabasePath()` (final database)

## Common Commands

### Type Checking
```bash
# Check all workspaces
bun run typecheck

# Check specific workspace
cd functions/scraper && bun run typecheck
cd functions/parser && bun run typecheck
cd functions/migrator && bun run typecheck
cd application && bun run typecheck
```

### Application Development
```bash
# Start the web application server
cd application && bun run start
# Server runs with HMR in development mode
```

### Data Pipeline

The data pipeline follows this order: scrape → parse → migrate

**1. Scraping (fetch raw data from API)**
```bash
cd functions/scraper
bun run scrape-table.ts <TableName>           # Scrape specific table
bun run scrape-table.ts <TableName> <startId> # Resume from specific ID
bun run scrape-table.ts all-tables            # Scrape all tables
```

**2. Parsing (transform raw data)**
```bash
cd functions/parser
bun run parse-data.ts <TableName>
```

**3. Migration (import to final schema)**
```bash
cd functions/migrator
bun run import-data.ts
# Imports all tables in predefined order (see IMPORT_ORDER constant)
```

## Key Architecture Patterns

### Data Pipeline Flow

Each table goes through a three-stage ETL process:

1. **Scraper** (`functions/scraper/`):
   - Fetches paginated data from `https://avoindata.eduskunta.fi/api/v1/tables/{TableName}/batch`
   - Stores raw responses in `eduskunta-raw-data.db`
   - Uses primary key-based pagination (`pkStartValue`)
   - Rate-limited with 10ms between requests

2. **Parser** (`functions/parser/`):
   - Reads from raw database table by table
   - Applies custom parser functions from `fn/{TableName}.ts` if available
   - Falls back to default parser if no custom parser exists
   - Writes transformed data to `eduskunta-parsed-data.db`
   - Can output sample JSON files when `DEBUG=true`

3. **Migrator** (`functions/migrator/`):
   - Uses `bun-sqlite-migrations` for schema management
   - Migrations stored in `functions/migrator/migrations/`
   - Each table has a migrator function in `{TableName}/migrator.ts`
   - Imports occur in specific order (defined in `IMPORT_ORDER`)
   - Clears all tables before importing to ensure clean state

### Application Architecture

The web application (`application/`) has a simple structure:

- **server/** - Bun HTTP server with type-safe routing
  - Uses Bun's built-in routing with typed request params
  - Database queries through `DatabaseConnection` class
  - Read-only SQLite connection with WAL mode

- **client/** - React SPA
  - Pages: `About/`, `Edustajat/`, `Votings/`
  - Entry point: `root.tsx` → `app.tsx`
  - Material-UI components with Emotion styling

- **database/** - Database access layer
  - `db.ts` exports `DatabaseConnection` class
  - `queries.ts` contains SQL query strings
  - All queries use prepared statements for safety

### Path Aliasing

TypeScript path aliases are configured per workspace. Common pattern:
- `#database` → `shared/database/index.ts`
- `#constants` → `shared/constants/index.ts`

Check each workspace's `tsconfig.json` for specific path mappings.

### Table Names and Constants

All supported table names are defined in `shared/constants/TableNames.ts`. Primary keys for each table are in `shared/constants/PrimaryKeys.ts`.

Common tables:
- `MemberOfParliament` - Representative data
- `SaliDBAanestys` - Voting sessions
- `SaliDBAanestysEdustaja` - Individual votes by representatives
- `SaliDBIstunto` - Parliamentary sessions
- `SaliDBKohta` - Agenda items

## Development Notes

### Adding Support for a New Table

1. Ensure table name exists in `shared/constants/TableNames.ts`
2. (Optional) Create custom parser: `functions/parser/fn/{TableName}.ts`
3. Create migrator: `functions/migrator/{TableName}/migrator.ts`
4. Add migration SQL if needed: `functions/migrator/migrations/V*.sql`
5. Update `IMPORT_ORDER` in `functions/migrator/import-data.ts` if dependencies exist
6. Run the pipeline: scrape → parse → migrate

### SQLite WAL Mode

All database connections use `PRAGMA journal_mode = WAL;` for better concurrency and performance. This is critical for the application to work correctly.

### Module System

All packages use ESM modules (`"type": "module"` in package.json). Import statements must include file extensions in some contexts. TypeScript is configured with `"module": "preserve"` and `"allowImportingTsExtensions": true`.

### Error Handling in Scraper

The scraper has a safety limit (`MAX_LOOP_LIMIT = 10_000`) to prevent infinite loops. If this limit is reached, it throws a "Sanity check error". This can be adjusted for large tables.

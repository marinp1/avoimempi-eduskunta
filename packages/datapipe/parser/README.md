# Eduskunta Data Pipeline - Parser

The parser transforms raw scraped data into a parsed/normalized format. It reads from the storage `raw` stage and writes to the `parsed` stage.

## Overview

The parser:
- Reads raw API responses from storage (JSON files created by the scraper)
- Converts array-based row data to object format with column names
- Applies custom transformation logic (if available)
- Writes parsed data back to storage in the `parsed` stage

## Usage

### Parse a Table

```bash
cd datapipe
bun parser/cli.ts <TableName>

# Or using npm script
bun run parse <TableName>
```

Example:
```bash
bun run parse MemberOfParliament
```

### Check Status

View parsing status for all tables:

```bash
bun parser/cli.ts status
# Or
bun run parse:status
```

This shows:
- Which tables have raw data
- Which tables have been parsed
- Progress percentage for each table

## How It Works

### Data Flow

1. **Input**: Reads from `raw/<TableName>/page_*.json` files
   - Format: API response with `columnNames`, `rowData` (array of arrays), `pkName`, etc.

2. **Processing**:
   - Converts each row from array format to object format using column names
   - Applies custom parser function if available (from `fn/<TableName>.ts`)
   - Falls back to default parser (pass-through) if no custom parser exists

3. **Output**: Writes to `parsed/<TableName>/page_*.json` files
   - Format: Same structure but `rowData` contains objects instead of arrays
   - Maintains page structure for consistency

### Example Transformation

**Input (raw):**
```json
{
  "columnNames": ["HenkiloId", "Etunimi", "Sukunimi"],
  "pkName": "HenkiloId",
  "rowData": [
    [123, "John", "Doe"],
    [124, "Jane", "Smith"]
  ],
  "rowCount": 2
}
```

**Output (parsed):**
```json
{
  "columnNames": ["HenkiloId", "Etunimi", "Sukunimi"],
  "pkName": "HenkiloId",
  "rowData": [
    { "HenkiloId": 123, "Etunimi": "John", "Sukunimi": "Doe" },
    { "HenkiloId": 124, "Etunimi": "Jane", "Sukunimi": "Smith" }
  ],
  "rowCount": 2
}
```

## Custom Parsers

Custom parsers allow you to transform data during parsing. They're useful for:
- Parsing XML/JSON fields
- Removing unused columns
- Normalizing data formats
- Creating readable identifiers

### Creating a Custom Parser

1. Create a file: `fn/<TableName>.ts`
2. Export a default function matching the `ParserFunction` type:

```typescript
import type { ParserFunction } from "../parser";

const parser: ParserFunction = async (row, primaryKey) => {
  // Transform the row data
  const transformedData = {
    ...row,
    // Your transformations here
  };

  // Return [identifier, transformedData]
  return [`${row[primaryKey]}`, transformedData];
};

export default parser;
```

### Parser Function Signature

```typescript
type ParserFunction = (
  row: Record<string, any>,    // Row data as object
  primaryKey: string            // Name of primary key column
) => Promise<[
  identifier: string,           // Unique identifier for this row
  data: Record<string, any>     // Transformed row data
]>;
```

### Example: MemberOfParliament Parser

The `fn/MemberOfParliament.ts` parser:
- Parses XML data from `XmlDataFi` field
- Removes unused XML language variants (`XmlData`, `XmlDataEn`, `XmlDataSv`)
- Creates readable identifiers like `Andersson_Matti_123`

```typescript
const parser: ParserFunction = async (row, primaryKey) => {
  // Parse XML data
  const parsedXml = row.XmlDataFi ? parseXml(row.XmlDataFi) : null;

  // Create readable identifier
  const sortName = parsedXml?.Henkilo?.LajitteluNimi?.replace(/\s+/g, "_") ?? "tuntematon";

  return [
    `${sortName}_${row[primaryKey]}`,
    {
      ...row,
      XmlDataFi: parsedXml,
      XmlData: undefined,
      XmlDataEn: undefined,
      XmlDataSv: undefined,
    },
  ];
};
```

## Architecture

### Files

- **`parser.ts`** - Core parsing logic
  - `parseTable()` - Parse a single table
  - `parseTables()` - Parse multiple tables
  - Default parser implementation
  - Parser function loader

- **`cli.ts`** - Command-line interface
  - Table parsing commands
  - Status reporting
  - Batch processing

- **`fn/<TableName>.ts`** - Custom parser functions (optional)
  - One file per table that needs custom parsing
  - Exports default `ParserFunction`

- **`types.ts`** - TypeScript type definitions
  - XML parsing types
  - Shared parser types

### Design Decisions

1. **Page-by-page processing**: Each page is processed independently, allowing for:
   - Resumable parsing
   - Parallel processing (future enhancement)
   - Lower memory usage

2. **Storage abstraction**: Uses the same storage layer as scraper
   - Works with local filesystem, S3, R2, MinIO
   - Configured via environment variables

3. **Optional custom parsers**: 
   - Default parser provides pass-through behavior
   - Custom parsers only needed when transformation is required
   - Graceful fallback if custom parser fails to load

4. **Preserves structure**: Maintains the page structure from raw stage
   - Easier to track data lineage
   - Consistent storage patterns

## Configuration

Parser inherits configuration from the storage layer:

```bash
# Storage backend (default: local)
export STORAGE_PROVIDER=local

# Local storage directory (default: ./data)
export STORAGE_LOCAL_DIR=./data

# For S3/R2/MinIO (future support)
export STORAGE_PROVIDER=s3
export STORAGE_S3_REGION=us-east-1
export STORAGE_S3_BUCKET=my-bucket
export STORAGE_S3_ACCESS_KEY_ID=xxx
export STORAGE_S3_SECRET_ACCESS_KEY=xxx
```

## Common Tables

Tables you might want to parse:
- `MemberOfParliament` - Representatives (has custom parser for XML)
- `SaliDBAanestys` - Voting sessions
- `SaliDBAanestysEdustaja` - Individual votes
- `SaliDBIstunto` - Parliamentary sessions
- `SaliDBKohta` - Agenda items

## Workflow

Typical data pipeline workflow:

```bash
# 1. Scrape raw data
bun run scrape MemberOfParliament

# 2. Check scraping status
bun run scrape:status

# 3. Parse the data
bun run parse MemberOfParliament

# 4. Check parsing status
bun run parse:status
```

## Comparison with Old Parser

### Old Parser (functions/parser)
- Reads from SQLite raw database
- Writes to SQLite parsed database
- Uses SQL queries
- Tightly coupled to SQLite

### New Parser (datapipe/parser)
- Reads from storage (JSON files)
- Writes to storage (JSON files)
- Storage-agnostic (local, S3, R2, MinIO)
- Better for cloud deployments
- Easier to inspect data (JSON files)
- More modular and testable

## Error Handling

The parser handles errors gracefully:

1. **Missing custom parser**: Falls back to default parser with warning
2. **XML parsing errors**: Logs warning and continues with null value
3. **Table not found**: Shows warning and exits cleanly
4. **Invalid page data**: Logs warning and skips page

## Performance

- Processes pages sequentially (parallel processing can be added)
- Progress updates after each page
- Memory efficient (one page at a time)
- Typical speed: ~100-1000 rows/second depending on parser complexity

## Testing

After implementing a custom parser, test it:

```bash
# Parse a single table
bun run parse YourTableName

# Check the output in storage
ls -la data/parsed/YourTableName/

# View a parsed page
cat data/parsed/YourTableName/page_1.json | jq .
```

## Next Steps

After parsing:
1. Data is ready for the migrator stage (importing to SQLite database)
2. Or can be consumed directly from storage for other purposes
3. Can be synced to cloud storage for backup/sharing

## Troubleshooting

**Parser fails to load custom parser:**
- Check that `fn/<TableName>.ts` exists and has correct syntax
- Verify it exports a default function
- Parser will fall back to default parser

**No raw data found:**
- Run scraper first: `bun run scrape <TableName>`
- Check storage with: `bun run scrape:status`

**Parsed pages don't match raw pages:**
- Re-run parser: `bun run parse <TableName>`
- Parser will overwrite existing parsed pages

**XML parsing errors (MemberOfParliament):**
- Install xml-js: `bun install xml-js`
- Check that XML data format hasn't changed

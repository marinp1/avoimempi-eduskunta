# Eduskunta Data Pipeline (v2)

Modern, offline-first data pipeline for Finnish Parliament data with cloud-agnostic storage.

## Architecture

```
API → Scraper → raw/*.json → Parser → parsed/*.json → Migrator → SQLite
```

### Key Improvements over v1:

- ✅ **Offline-first**: Works without cloud dependencies
- ✅ **Cloud-agnostic**: Easy sync to S3/R2/MinIO when needed
- ✅ **Immutable storage**: Append-only, never modify existing files
- ✅ **Incremental**: Resume from where you left off
- ✅ **Inspectable**: JSON files are human-readable
- ✅ **Reproducible**: SQLite can be rebuilt anytime
- ✅ **Parallel**: Process different tables/pages concurrently

## Storage Structure

```
data/
├── raw/
│   ├── MemberOfParliament/
│   │   ├── page_000000000001+000000000100.json
│   │   ├── page_000000000101+000000000200.json
│   │   └── page_000000000201+000000000250.json
│   └── SaliDBAanestys/
│       └── page_000000000001+000000000100.json
└── parsed/
    └── MemberOfParliament/
        └── page_000000000001+000000000100.json
```

## Getting Started

### 1. Configuration

Copy `.env.example` to `.env` (optional - defaults work out of the box):

```bash
cp ../.env.example ../.env
```

Default configuration uses local filesystem storage in `./data` directory.

### 2. Scrape Data

#### Scrape a table:
```bash
bun run scrape MemberOfParliament
```

The scraper automatically resumes from the last scraped page.

#### Scrape from a specific PK value:
```bash
bun run scrape MemberOfParliament --from-pk=500
```

#### Check status:
```bash
bun run scrape:status
```

Shows progress for all tables.

## CLI Commands

```bash
# Scrape a table (auto-resumes from last page)
bun scraper/cli.ts <TableName>

# Scrape from a specific PK value
bun scraper/cli.ts <TableName> --from-pk=<pkValue>

# Scrape a single page starting at a PK
bun scraper/cli.ts <TableName> --page-pk=<pkValue>

# Show status
bun scraper/cli.ts status

# Help
bun scraper/cli.ts help
```

## Examples

### Basic Usage

```bash
# Start scraping a table
bun run scrape MemberOfParliament

# Output:
# 📥 Scraping table: MemberOfParliament
# 📁 Storage: local
# 📊 Stage: raw
# 📋 Total rows in API: 1,234
# 🚀 Starting fresh
#
# 📡 Fetching batch from PK 0...
# ✅ Saved page_000000000001+000000000100 (100 rows) - 8.1% complete
# 📡 Fetching batch from PK 101...
# ✅ Saved page_000000000101+000000000200 (100 rows) - 16.2% complete
# ...
```

### Resume After Interruption

```bash
# Scraper automatically resumes from last page
bun run scrape MemberOfParliament

# Output:
# 📥 Scraping table: MemberOfParliament
# ✅ Already scraped: 5 pages (complete)
# 🔄 Re-scraping last page from PK: 401
```

### Check Progress

```bash
bun run scrape:status

# Output:
# 📊 Scraping Status
#
# ✅ Complete MemberOfParliament          - 13 pages (100.0%)
# ⏳ In progress SaliDBAanestys           - 25 pages (45.2%)
# ❌ Not started SaliDBIstunto            - 0 pages (0.0%)
```

## Storage Configuration

### Local Storage (Default)

No configuration needed. Data stored in `./data` directory.

```bash
# Optional: customize directory
export STORAGE_LOCAL_DIR=/path/to/data
```

### Cloud Storage (Future)

When ready to sync to cloud, update `.env`:

```bash
# For AWS S3
STORAGE_PROVIDER=s3
STORAGE_S3_REGION=us-east-1
STORAGE_S3_BUCKET=eduskunta-data
STORAGE_S3_ACCESS_KEY_ID=your-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret

# For Cloudflare R2
STORAGE_PROVIDER=r2
STORAGE_S3_REGION=auto
STORAGE_S3_BUCKET=eduskunta-data
STORAGE_S3_ACCESS_KEY_ID=your-key
STORAGE_S3_SECRET_ACCESS_KEY=your-secret
STORAGE_S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
```

## Programmatic Usage

```typescript
import { scrapeTable, scrapeTables } from "./scraper/scraper";

// Scrape single table
await scrapeTable({
  tableName: "MemberOfParliament",
  onProgress: (progress) => {
    console.log(`Page ${progress.page}: ${progress.percentComplete}%`);
  },
});

// Scrape multiple tables
await scrapeTables(["MemberOfParliament", "SaliDBAanestys"]);
```

## Data Format

Each page is saved as a JSON file with the following structure:

```json
{
  "columnNames": ["personId", "lastName", "firstName", ...],
  "pkName": "personId",
  "pkLastValue": 199,
  "rowData": [
    [100, "Virtanen", "Matti", ...],
    [101, "Korhonen", "Liisa", ...],
    ...
  ],
  "rowCount": 100,
  "hasMore": true
}
```

This is the raw API response from Eduskunta, saved as-is for reproducibility.

## Migration from Old Pipeline

The old pipeline (`functions/scraper`) is still available and functional. The new pipeline (`datapipe/scraper`) is designed to work alongside it.

**Key differences:**

| Old Pipeline | New Pipeline |
|--------------|--------------|
| SQLite storage | JSON file storage |
| Single database | One file per page |
| Hard to sync | Easy to sync |
| Binary format | Human-readable |
| Monolithic | Modular |

**Migration strategy:**

1. Start using new scraper for new data
2. Old SQLite databases can coexist
3. Eventually migrate old data to JSON format (optional)
4. New parser will read from JSON files

## Troubleshooting

### "No more data to scrape" immediately

The API might have rate limiting. Wait a few minutes and try again.

### Storage permission errors

Check that the `STORAGE_LOCAL_DIR` is writable:

```bash
mkdir -p data
chmod 755 data
```

### Large file sizes

Each page is ~10-50KB of JSON. For tables with 10,000 rows (100 pages), expect ~5MB total.

## Next Steps

- [ ] Implement parser to convert `raw/*.json` → `parsed/*.json`
- [ ] Implement migrator to convert `parsed/*.json` → SQLite
- [ ] Add S3-compatible storage provider
- [ ] Add sync commands for cloud storage
- [ ] Add parallel processing for faster scraping

## See Also

- Storage abstraction: `../shared/storage/README.md`
- Old scraper: `../functions/scraper/`
- Parser (coming soon): `./parser/`

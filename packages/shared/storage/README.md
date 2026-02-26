# Storage Abstraction Layer

Offline-first, cloud-agnostic storage system for the Eduskunta data pipeline.

## Architecture

```
Data Pipeline:
  Scraper  →  raw/<table>/page_{firstPk}+{lastPk}.json
  Parser   →  parsed/<table>/page_{firstPk}+{lastPk}.json
  Migrator →  SQLite (rebuilt from parsed/)
```

## Features

- **Offline-first**: Works locally without any cloud dependencies
- **Cloud-agnostic**: Same API for local filesystem, S3, R2, MinIO, etc.
- **Immutable data**: Append-only, never modify existing files
- **Incremental**: Resume scraping/parsing from where you left off
- **Reproducible**: SQLite can be rebuilt anytime from parsed data

## Storage Structure

```
data/
├── raw/
│   ├── MemberOfParliament/
│   │   ├── page_000000000001+000000000100.json
│   │   ├── page_000000000101+000000000200.json
│   │   └── ...
│   └── SaliDBAanestys/
│       ├── page_000000000001+000000000100.json
│       └── ...
└── parsed/
    ├── MemberOfParliament/
    │   ├── page_000000000001+000000000100.json
    │   └── ...
    └── ...
```

## Usage

### Basic Example

```typescript
import { getStorage, StorageKeyBuilder } from "#storage";

const storage = getStorage();

// Write data
const key = StorageKeyBuilder.forPkRange("raw", "MemberOfParliament", 1, 100);
await storage.put(key, JSON.stringify(data));

// Read data
const data = await storage.get(key);
if (data) {
  const parsed = JSON.parse(data);
}

// Check if exists
const exists = await storage.exists(key);

// List all pages for a table
const prefix = StorageKeyBuilder.listPrefixForTable("raw", "MemberOfParliament");
const result = await storage.list({ prefix });
console.log(`Found ${result.keys.length} pages`);

// Get metadata
const meta = await storage.metadata(key);
console.log(`Size: ${meta.size}, Last modified: ${meta.lastModified}`);
```

### Scraper Example

```typescript
import { getStorage, StorageKeyBuilder, listAllStorageKeys } from "#storage";

const storage = getStorage();
const tableName = "MemberOfParliament";

// Check what pages already exist
const prefix = StorageKeyBuilder.listPrefixForTable("raw", tableName);
const existing = await listAllStorageKeys(storage, { prefix, pageSize: 10_000 });

// Find the last scraped page by highest lastPk
const lastRef = existing.length > 0
  ? existing
      .map(k => StorageKeyBuilder.parseKey(k.key))
      .filter(Boolean)
      .reduce((max, curr) => curr!.lastPk > max!.lastPk ? curr : max)
  : null;

let pkStartValue = lastRef ? lastRef.firstPk : 0; // re-scrape last page from its firstPk
let hasMore = true;

while (hasMore) {
  const data = await fetchFromAPI(tableName, pkStartValue);
  const { firstPk, lastPk } = extractPkRange(data);

  const key = StorageKeyBuilder.forPkRange("raw", tableName, firstPk, lastPk);
  await storage.put(key, JSON.stringify(data));

  hasMore = data.hasMore;
  pkStartValue = lastPk + 1;
}
```

## Configuration

### Local Storage (Default)

No configuration needed. Data stored in `./data` by default.

```bash
# Optional: customize directory
export STORAGE_LOCAL_DIR=/path/to/data
```

### AWS S3

```bash
export STORAGE_PROVIDER=s3
export STORAGE_S3_REGION=us-east-1
export STORAGE_S3_BUCKET=my-bucket
export STORAGE_S3_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export STORAGE_S3_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

### Cloudflare R2

```bash
export STORAGE_PROVIDER=r2
export STORAGE_S3_REGION=auto
export STORAGE_S3_BUCKET=eduskunta-data
export STORAGE_S3_ACCESS_KEY_ID=your-r2-access-key-id
export STORAGE_S3_SECRET_ACCESS_KEY=your-r2-secret-access-key
export STORAGE_S3_ENDPOINT=https://account-id.r2.cloudflarestorage.com
```

### MinIO (Self-hosted)

```bash
export STORAGE_PROVIDER=minio
export STORAGE_S3_REGION=us-east-1
export STORAGE_S3_BUCKET=eduskunta-data
export STORAGE_S3_ACCESS_KEY_ID=minioadmin
export STORAGE_S3_SECRET_ACCESS_KEY=minioadmin
export STORAGE_S3_ENDPOINT=http://localhost:9000
```

## Providers

### Implemented

- ✅ **LocalStorageProvider**: Filesystem-based storage (default)

### Planned

- ⏳ **S3StorageProvider**: AWS S3, Cloudflare R2, MinIO, etc.
- ⏳ **SyncStorageProvider**: Hybrid local + cloud with automatic sync

## Benefits vs. SQLite Databases

### Old Approach (SQLite)
- ❌ Hard to sync between machines
- ❌ Binary format, hard to inspect
- ❌ Locking issues
- ❌ Must backup entire database
- ❌ Hard to version control

### New Approach (JSON Files)
- ✅ Easy to sync (rsync, rclone, git-lfs, cloud storage)
- ✅ Human-readable, easy to debug
- ✅ No locking, parallel processing
- ✅ Incremental backups
- ✅ Each file independently versioned
- ✅ Final SQLite is reproducible cache

## Migration Guide

### From Old Pipeline

Old:
```
Scraper → eduskunta-raw-data.db
Parser  → eduskunta-parsed-data.db
```

New:
```
Scraper → data/raw/<table>/page_{firstPk}+{lastPk}.json
Parser  → data/parsed/<table>/page_{firstPk}+{lastPk}.json
```

The scraper and parser will be updated to use this storage abstraction.

## API Reference

### StorageKeyBuilder

Helper class for constructing storage keys:

```typescript
// Create key for a PK range
StorageKeyBuilder.forPkRange("raw", "MemberOfParliament", 1, 100)
// Returns: "raw/MemberOfParliament/page_000000000001+000000000100.json"

// Create prefix for listing table pages
StorageKeyBuilder.listPrefixForTable("parsed", "SaliDBAanestys")
// Returns: "parsed/SaliDBAanestys/"

// Parse a key back to components
StorageKeyBuilder.parseKey("raw/MemberOfParliament/page_000000000001+000000000100.json")
// Returns: { stage: "raw", table: "MemberOfParliament", firstPk: 1, lastPk: 100 }
```

### IStorageProvider

All storage providers implement this interface:

```typescript
interface IStorageProvider {
  put(key: string, data: string | Buffer): Promise<void>;
  putFile?(key: string, localFilePath: string): Promise<void>;
  getFile?(key: string, localFilePath: string): Promise<void>;
  get(key: string): Promise<string | null>;
  exists(key: string): Promise<boolean>;
  list(options?: StorageListOptions): Promise<StorageListResult>;
  delete(key: string): Promise<void>;
  metadata(key: string): Promise<StorageMetadata | null>;
}
```

## Testing

```bash
# Run with local storage (default)
bun test

# Run with different storage provider
STORAGE_PROVIDER=s3 bun test
```

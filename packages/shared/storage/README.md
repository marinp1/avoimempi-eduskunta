# Shared Storage

The storage layer has two distinct parts:

1. **Row store** (`#storage/row-store`): SQLite-backed row persistence for scraper/parser stages (`raw.db`, `parsed.db`)
2. **Object storage provider** (`#storage`): key/value blob storage for artifacts, manifests, and migration reports

## Current architecture

```txt
Row pipeline data:
  scraper -> data/raw.db
  parser  -> data/parsed.db
  migrator reads parsed.db and writes app DB

Artifact/metadata storage:
  artifacts/sqlite/latest/*
  metadata/migration-runs/*
  (via getStorage() provider)
```

## Row store (`#storage/row-store`)

### Files

- `data/raw.db`: raw API rows + column schema hashes
- `data/parsed.db`: parsed/normalized rows

### Factory usage

```typescript
import { getRawRowStore, getParsedRowStore } from "#storage/row-store/factory";

const rawStore = getRawRowStore();
const parsedStore = getParsedRowStore();
```

### Example: write raw rows

```typescript
await rawStore.upsertBatch("MemberOfParliament", "HenkiloId", columnNames, [
  { pk: 123, data: JSON.stringify(rawArrayRow) },
]);
```

### Example: iterate parsed rows

```typescript
for await (const row of parsedStore.list("MemberOfParliament")) {
  const parsed = JSON.parse(row.data);
  // parsed is an object written by parser stage
}
```

### Row-store configuration

Row-store directory resolution:

1. `ROW_STORE_DIR` (if set)
2. `STORAGE_LOCAL_DIR` (if set)
3. default `<repo>/data`

The directory contains both `raw.db` and `parsed.db`.

## Object storage provider (`#storage`)

`getStorage()` returns an `IStorageProvider` implementation used for non-row artifacts (for example SQLite snapshots, manifests, and migration reports).

```typescript
import { getStorage } from "#storage";

const storage = getStorage();
await storage.put("metadata/example.json", JSON.stringify({ ok: true }));
```

### Provider status

- implemented: `local`
- configured but not implemented yet: `s3`, `r2`, `minio` (factory throws)

### Local provider behavior

For `STORAGE_PROVIDER=local`, keys map to files under `STORAGE_LOCAL_DIR` (default `<repo>/data`).

Example keys:

- `artifacts/sqlite/latest/manifest.json`
- `artifacts/sqlite/latest/avoimempi-eduskunta.db`
- `metadata/migration-runs/latest.json`

## API surface

### Row store types

- `IRowStore`
- `StoredRow`
- `ColumnSchema`

Export path:

```typescript
import type { IRowStore, StoredRow, ColumnSchema } from "#storage/row-store";
```

### Object storage types

- `IStorageProvider`
- `StorageMetadata`
- `StorageListOptions`
- `StorageListResult`
- helpers: `listAllStorageKeys`, `StorageKeyBuilder`

Export path:

```typescript
import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";
```

## Notes

- `StorageKeyBuilder` still models `raw/` and `parsed/` page keys for compatibility helpers, but the active pipeline stores rows in `raw.db`/`parsed.db`.
- row-store DBs use SQLite WAL mode for better write/read concurrency.
- final app DB (`avoimempi-eduskunta.db`) is rebuilt by migrator and can be published as an artifact via object storage.

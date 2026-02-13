export const SQLITE_PRAGMAS = {
  journalWal: "PRAGMA journal_mode = WAL;",
  queryOnlyOn: "PRAGMA query_only = ON;",
  synchronousOff: "PRAGMA synchronous = OFF;",
  synchronousFull: "PRAGMA synchronous = FULL;",
  cacheSize64Mb: "PRAGMA cache_size = -64000;",
  tempStoreMemory: "PRAGMA temp_store = MEMORY;",
  mmapSize30Gb: "PRAGMA mmap_size = 30000000000;",
} as const;

export const MIGRATOR_SQL = {
  listTables: "SELECT name FROM sqlite_master WHERE type='table';",
  beginTransaction: "BEGIN TRANSACTION;",
  commit: "COMMIT;",
  rollback: "ROLLBACK;",
  createMigrationInfoTable:
    "CREATE TABLE IF NOT EXISTS _migration_info (key TEXT PRIMARY KEY, value TEXT);",
  upsertMigrationTimestamp:
    "INSERT OR REPLACE INTO _migration_info (key, value) VALUES ('last_migration', ?);",
} as const;

function escapeSqliteIdentifier(identifier: string): string {
  return identifier.replaceAll('"', '""');
}

export function getDeleteAllRowsQuery(tableName: string): string {
  return `DELETE FROM "${escapeSqliteIdentifier(tableName)}";`;
}

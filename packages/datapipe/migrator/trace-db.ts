import sqlite from "bun:sqlite";
import { getTraceDatabasePath } from "#database";
import { getRawRowStore } from "#storage/row-store/factory";

const TRACE_SCHEMA_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS ImportSourceReference (
    id INTEGER PRIMARY KEY,
    source_table TEXT NOT NULL,
    source_page INTEGER,
    source_pk_name TEXT,
    source_pk_value TEXT,
    scraped_at TEXT,
    migrated_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_import_source_reference_lookup
    ON ImportSourceReference(source_table, source_pk_name, source_pk_value)`,
  `CREATE INDEX IF NOT EXISTS idx_import_source_reference_scraped_at
    ON ImportSourceReference(scraped_at)`,
  `CREATE TABLE IF NOT EXISTS ImportSourceReferenceSummary (
    source_table TEXT PRIMARY KEY,
    imported_rows INTEGER NOT NULL,
    distinct_pages INTEGER NOT NULL,
    first_scraped_at TEXT,
    last_scraped_at TEXT,
    first_migrated_at TEXT,
    last_migrated_at TEXT
  ) WITHOUT ROWID`,
];

const BATCH_SIZE = 5_000;

export async function rebuildTraceDatabase(): Promise<void> {
  const tracePath = getTraceDatabasePath();
  const rawStore = getRawRowStore();

  console.log(`\n🔍 Rebuilding trace database at ${tracePath}...`);

  const traceDb = sqlite.open(tracePath, { create: true, readwrite: true });

  try {
    traceDb.run("PRAGMA journal_mode = WAL;");
    traceDb.run("PRAGMA synchronous = OFF;");
    traceDb.run("PRAGMA cache_size = -32000;");
    traceDb.run("PRAGMA temp_store = MEMORY;");

    for (const stmt of TRACE_SCHEMA_STATEMENTS) {
      traceDb.run(stmt);
    }

    traceDb.run("DELETE FROM ImportSourceReference;");
    traceDb.run("DELETE FROM ImportSourceReferenceSummary;");

    const migratedAt = new Date().toISOString();
    const tableNames = await rawStore.tableNames();

    const insertStmt = traceDb.prepare(
      `INSERT INTO ImportSourceReference (source_table, source_page, source_pk_name, source_pk_value, scraped_at, migrated_at)
       VALUES (?, NULL, ?, ?, ?, ?)`,
    );

    const runBatch = traceDb.transaction(
      (batch: Array<[string, string | null, string, string | null, string]>) => {
        for (const vals of batch) {
          insertStmt.run(...vals);
        }
      },
    );

    let totalRows = 0;

    for (const tableName of tableNames) {
      const schemas = await rawStore.listColumnSchemas(tableName);
      const pkName = schemas[0]?.pkName ?? null;

      let batch: Array<[string, string | null, string, string | null, string]> =
        [];
      let tableRows = 0;

      for await (const row of rawStore.list(tableName)) {
        batch.push([
          tableName,
          pkName,
          String(row.pk),
          row.createdAt || null,
          migratedAt,
        ]);
        tableRows++;

        if (batch.length >= BATCH_SIZE) {
          runBatch(batch);
          batch = [];
        }
      }

      if (batch.length > 0) {
        runBatch(batch);
      }

      totalRows += tableRows;
      console.log(`  📋 ${tableName}: ${tableRows.toLocaleString()} rows`);
    }

    traceDb.run(
      `INSERT INTO ImportSourceReferenceSummary
         (source_table, imported_rows, distinct_pages, first_scraped_at, last_scraped_at, first_migrated_at, last_migrated_at)
       SELECT
         source_table,
         COUNT(*) AS imported_rows,
         COUNT(DISTINCT source_page) AS distinct_pages,
         MIN(scraped_at) AS first_scraped_at,
         MAX(scraped_at) AS last_scraped_at,
         MIN(migrated_at) AS first_migrated_at,
         MAX(migrated_at) AS last_migrated_at
       FROM ImportSourceReference
       GROUP BY source_table`,
    );

    traceDb.run("PRAGMA synchronous = FULL;");
    traceDb.run("PRAGMA wal_checkpoint(TRUNCATE);");

    console.log(
      `✅ Trace database rebuilt (${totalRows.toLocaleString()} total rows across ${tableNames.length} tables)`,
    );
  } finally {
    traceDb.close();
  }
}

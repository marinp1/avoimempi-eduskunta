/**
 * One-off seed script: streams all rows from local SQLite row stores (raw.db
 * and parsed.db) into a PostgreSQL Serverless SQL Database.
 *
 * Safe to run multiple times — upsertBatch uses ON CONFLICT DO UPDATE.
 *
 * Usage:
 *   ROW_STORE_DATABASE_URL=postgres://... bun run scripts/seed-postgres-row-store.ts
 *
 * Optional flags:
 *   --raw-only      Seed only the raw store
 *   --parsed-only   Seed only the parsed store
 *   --table <name>  Seed only a specific table (applies to both stores)
 */
import path from "node:path";
import { getStorageConfig } from "#storage/config";
import { PostgresRowStore } from "#storage/row-store/providers/postgres";
import { SqliteRowStore } from "#storage/row-store/providers/sqlite";
import type { IRowStore } from "#storage/row-store/types";

const BATCH_SIZE = 500;

// ---------------------------------------------------------------------------
// Args
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);
const rawOnly = args.includes("--raw-only");
const parsedOnly = args.includes("--parsed-only");
const tableFilter = (() => {
  const idx = args.indexOf("--table");
  return idx !== -1 ? args[idx + 1] : null;
})();

// ---------------------------------------------------------------------------
// Resolve paths
// ---------------------------------------------------------------------------

function getSqliteDir(): string {
  if (process.env.ROW_STORE_DIR) return path.resolve(process.env.ROW_STORE_DIR);
  const config = getStorageConfig();
  if (config.local?.baseDir) return path.resolve(config.local.baseDir);
  return path.resolve(process.cwd(), "data");
}

// ---------------------------------------------------------------------------
// Seed helpers
// ---------------------------------------------------------------------------

async function seedRawStore(
  source: SqliteRowStore,
  target: PostgresRowStore,
  tableFilter: string | null,
): Promise<void> {
  const tableNames = tableFilter
    ? [tableFilter]
    : await source.tableNames();

  if (tableNames.length === 0) {
    console.log("  (no tables in raw store)");
    return;
  }

  for (const tableName of tableNames) {
    const schemas = await source.listColumnSchemas(tableName);
    if (schemas.length === 0) {
      console.log(`  [raw] ${tableName}: no column schemas — skipping`);
      continue;
    }

    const schemaMap = new Map(schemas.map((s) => [s.hash, s]));

    // Accumulate rows per column-hash so each upsertBatch call gets a
    // consistent (pkName, columnNames) pair.
    const buffers = new Map<string, Array<{ pk: number; data: string; hash: string }>>();

    let rowsWritten = 0;

    const flush = async (colHash: string) => {
      const buf = buffers.get(colHash);
      if (!buf || buf.length === 0) return;
      const schema = schemaMap.get(colHash);
      if (!schema) {
        console.warn(`  [raw] ${tableName}: unknown schema hash ${colHash}, skipping ${buf.length} rows`);
        buffers.set(colHash, []);
        return;
      }
      await target.upsertBatch(tableName, schema.pkName, schema.columnNames, buf);
      rowsWritten += buf.length;
      buffers.set(colHash, []);
    };

    for await (const row of source.list(tableName)) {
      const colHash = row.columnHash;
      if (!buffers.has(colHash)) buffers.set(colHash, []);
      buffers.get(colHash)!.push({ pk: row.pk, data: row.data, hash: row.hash });

      if (buffers.get(colHash)!.length >= BATCH_SIZE) {
        await flush(colHash);
        process.stdout.write(`\r  [raw] ${tableName}: ${rowsWritten} rows written...`);
      }
    }

    // Flush remaining buffers
    for (const colHash of buffers.keys()) {
      await flush(colHash);
    }

    console.log(`\r  [raw] ${tableName}: ${rowsWritten} rows written          `);
  }
}

async function seedParsedStore(
  source: SqliteRowStore,
  target: PostgresRowStore,
  tableFilter: string | null,
): Promise<void> {
  const tableNames = tableFilter
    ? [tableFilter]
    : await source.tableNames();

  if (tableNames.length === 0) {
    console.log("  (no tables in parsed store)");
    return;
  }

  for (const tableName of tableNames) {
    const buf: Array<{ pk: number; data: string; hash: string }> = [];
    let rowsWritten = 0;

    for await (const row of source.list(tableName)) {
      buf.push({ pk: row.pk, data: row.data, hash: row.hash });

      if (buf.length >= BATCH_SIZE) {
        // pkName/columnNames unused in parsed mode
        await target.upsertBatch(tableName, "", [], buf);
        rowsWritten += buf.length;
        buf.length = 0;
        process.stdout.write(`\r  [parsed] ${tableName}: ${rowsWritten} rows written...`);
      }
    }

    if (buf.length > 0) {
      await target.upsertBatch(tableName, "", [], buf);
      rowsWritten += buf.length;
    }

    console.log(`\r  [parsed] ${tableName}: ${rowsWritten} rows written          `);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const dbUrl = process.env.ROW_STORE_DATABASE_URL;
  if (!dbUrl) {
    console.error("Error: ROW_STORE_DATABASE_URL is not set.");
    console.error("Usage: ROW_STORE_DATABASE_URL=postgres://... bun run scripts/seed-postgres-row-store.ts");
    process.exit(1);
  }

  const sqliteDir = getSqliteDir();
  console.log(`Source SQLite dir: ${sqliteDir}`);
  console.log(`Target:            ${dbUrl.replace(/:([^:@]+)@/, ":***@")}`);
  if (tableFilter) console.log(`Table filter:      ${tableFilter}`);
  console.log();

  if (!parsedOnly) {
    console.log("Seeding raw store...");
    const rawSource = new SqliteRowStore(path.join(sqliteDir, "raw.db"), "raw");
    const rawTarget = new PostgresRowStore(dbUrl, "raw");
    try {
      await seedRawStore(rawSource, rawTarget, tableFilter);
    } finally {
      rawSource.close();
      rawTarget.close();
    }
    console.log("Raw store done.\n");
  }

  if (!rawOnly) {
    console.log("Seeding parsed store...");
    const parsedSource = new SqliteRowStore(path.join(sqliteDir, "parsed.db"), "parsed");
    const parsedTarget = new PostgresRowStore(dbUrl, "parsed");
    try {
      await seedParsedStore(parsedSource, parsedTarget, tableFilter);
    } finally {
      parsedSource.close();
      parsedTarget.close();
    }
    console.log("Parsed store done.\n");
  }

  console.log("✅ Seed complete.");
}

main().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});

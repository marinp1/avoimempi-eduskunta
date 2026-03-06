import sqlite, { type Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import { getMigrations, migrate } from "bun-sqlite-migrations";
import { type TableName, TableNames } from "#constants/index";
import { getDatabasePath } from "#database";
import { getParsedRowStore } from "#storage/row-store/factory";
import { generateAndSaveChangesReport } from "./changes-report";
import { migrateVaskiData } from "./fn/VaskiData/migrator";
import {
  normalizeImportedTextData,
  rebuildFederatedSearchIndex,
  rebuildPersonSpeechDailyStats,
  rebuildPersonVotingDailyStats,
  rebuildVotingPartyStats,
} from "./post-import";
import { TABLE_MIGRATORS } from "./table-migrators";
import { rebuildTraceDatabase } from "./trace-db";
import { clearStatementCache } from "./utils";

// ---------------------------------------------------------------------------
// Inlined SQL constants (from server/database/sql-statements — not importable
// from datapipe due to package boundary)
// ---------------------------------------------------------------------------

const SQLITE_PRAGMAS = {
  journalWal: "PRAGMA journal_mode = WAL;",
  foreignKeysOff: "PRAGMA foreign_keys = OFF;",
  synchronousOff: "PRAGMA synchronous = OFF;",
  synchronousFull: "PRAGMA synchronous = FULL;",
  cacheSize64Mb: "PRAGMA cache_size = -64000;",
  tempStoreMemory: "PRAGMA temp_store = MEMORY;",
  mmapSize30Gb: "PRAGMA mmap_size = 30000000000;",
  lockingModeExclusive: "PRAGMA locking_mode = EXCLUSIVE;",
  lockingModeNormal: "PRAGMA locking_mode = NORMAL;",
} as const;

const MIGRATOR_SQL = {
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

function getDeleteAllRowsQuery(tableName: string): string {
  return `DELETE FROM "${escapeSqliteIdentifier(tableName)}";`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MigratorMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

export interface MigrationOptions {
  onMessage?: (message: MigratorMessage) => void;
  shouldStop?: () => boolean;
  /** Skip the "nothing changed" guard and always re-run migration. */
  force?: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Import order for tables to respect foreign key constraints
 */
const IMPORT_ORDER: Partial<Record<string, number>> = {
  MemberOfParliament: 0,
  SaliDBIstunto: 10,
  SaliDBKohta: 15,
  SaliDBPuheenvuoro: 16,
  SaliDBAanestys: 20,
  SaliDBKohtaAanestys: 21,
  SaliDBKohtaAsiakirja: 22,
  SaliDBTiedote: 23,
  SaliDBAanestysEdustaja: 30,
};

const DISABLED_IMPORT_TABLES = new Set<string>([
  "SaliDBAanestysAsiakirja",
  "SaliDBAanestysJakauma",
]);

const getVirtualTableNames = (db: Database): Set<string> => {
  const rows = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE 'CREATE VIRTUAL TABLE%';",
    )
    .all();
  return new Set(rows.map((row) => row.name));
};

const shouldSkipTableClear = (
  tableName: string,
  virtualTableNames: Set<string>,
): boolean => {
  if (tableName === "sqlite_sequence") {
    return true;
  }

  if (tableName.startsWith("sqlite_")) {
    return true;
  }

  if (virtualTableNames.has(tableName)) {
    return true;
  }

  for (const virtualName of virtualTableNames) {
    if (tableName.startsWith(`${virtualName}_`)) {
      return true;
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const isTruthyEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as { then?: unknown }).then === "function";

const parseOptionalPositiveInt = (
  value: string | undefined,
  fallback: number | null,
): number | null => {
  if (!value || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "off" || normalized === "none" || normalized === "full") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

// ---------------------------------------------------------------------------
// Table ordering
// ---------------------------------------------------------------------------

function getOrderedTables(): TableName[] {
  return [...(TableNames as unknown as TableName[])].sort(
    (a, b) =>
      (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
      (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
  );
}

async function getTablesWithParsedData(): Promise<TableName[]> {
  const allTables = getOrderedTables().filter(
    (tableName) => !DISABLED_IMPORT_TABLES.has(tableName),
  );

  const parsedStore = getParsedRowStore();
  const tablesInDb = new Set(await parsedStore.tableNames());
  return allTables.filter((tableName) => tablesInDb.has(tableName));
}

// ---------------------------------------------------------------------------
// Parsed data reader
// ---------------------------------------------------------------------------

async function* readParsedData(tableName: string): AsyncGenerator<any[]> {
  const parsedStore = getParsedRowStore();
  const BATCH_SIZE = 100;
  let batch: any[] = [];

  for await (const storedRow of parsedStore.list(tableName)) {
    batch.push(JSON.parse(storedRow.data));

    if (batch.length >= BATCH_SIZE) {
      yield batch;
      batch = [];
    }
  }

  if (batch.length > 0) {
    yield batch;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run database migration from parsed storage.
 *
 * This function is pure (no singleton state, no WebSocket, no maintenance
 * lock). Progress is reported via the optional `onMessage` callback. The
 * caller may request a stop by returning `true` from `shouldStop`.
 */
export async function runMigration(options?: MigrationOptions): Promise<void> {
  const checkStop = () => options?.shouldStop?.() ?? false;
  const onMessage = (msg: MigratorMessage) => options?.onMessage?.(msg);
  const force = options?.force ?? false;

  onMessage({
    type: "status",
    data: {
      status: "started",
      message: "Starting database migration",
    },
  });

  const useExclusiveLock = isTruthyEnv(process.env.MIGRATOR_EXCLUSIVE_LOCK);
  const shouldVacuumAfterImport =
    process.env.MIGRATOR_VACUUM_AFTER_IMPORT === undefined
      ? true
      : isTruthyEnv(process.env.MIGRATOR_VACUUM_AFTER_IMPORT);
  const federatedSearchBodyMaxChars = parseOptionalPositiveInt(
    process.env.MIGRATOR_FEDERATED_SEARCH_BODY_MAX_CHARS,
    4096,
  );

  try {
    const tablesToImport = await getTablesWithParsedData();

    if (tablesToImport.length === 0) {
      throw new Error("No parsed data found to migrate");
    }

    // Read previous rebuild timestamp before we overwrite it at the end.
    const previousRebuildAt = getLastMigrationTimestamp();

    // Change-detection: skip migration if no parsed table has been updated
    // since the last migration ran.
    if (!force) {
      const lastMigrationTs = previousRebuildAt;
      if (lastMigrationTs) {
        const parsedStore = getParsedRowStore();
        const lastUpdates = await Promise.all(
          tablesToImport.map((t) => parsedStore.lastUpdatedAt(t)),
        );
        const lastMigrationDate = new Date(lastMigrationTs);
        const anyChanged = lastUpdates.some(
          (ts) => ts && new Date(ts) > lastMigrationDate,
        );
        if (!anyChanged) {
          console.log(
            `⏭️  Skipping migration: parsed data has not changed since last migration (${lastMigrationTs})`,
          );
          onMessage({
            type: "complete",
            data: {
              message: `Skipped: parsed data has not changed since last migration (${lastMigrationTs})`,
              skipped: true,
              tablesImported: 0,
              timestamp: lastMigrationTs,
            },
          });
          return;
        }
      }
    }

    onMessage({
      type: "progress",
      data: {
        message: `Found ${tablesToImport.length} tables to import`,
        currentTable: null,
        tablesCompleted: 0,
        totalTables: tablesToImport.length,
      },
    });

    const targetDatabase = sqlite.open(getDatabasePath(), {
      create: true,
      readwrite: true,
    });

    targetDatabase.run(SQLITE_PRAGMAS.journalWal);

    console.log("⚙️  Applying SQLite performance optimizations...");
    targetDatabase.run(SQLITE_PRAGMAS.synchronousOff);
    targetDatabase.run(SQLITE_PRAGMAS.cacheSize64Mb);
    targetDatabase.run(SQLITE_PRAGMAS.tempStoreMemory);
    targetDatabase.run(SQLITE_PRAGMAS.mmapSize30Gb);
    targetDatabase.run(SQLITE_PRAGMAS.foreignKeysOff);
    if (useExclusiveLock) {
      targetDatabase.run(SQLITE_PRAGMAS.lockingModeExclusive);
    }

    const migrationsPath = path.resolve(import.meta.dirname, "migrations");
    console.log("🔄 Running database migrations...");
    migrate(targetDatabase, getMigrations(migrationsPath));
    console.log("✅ Migrations completed");

    console.log("🗑️  Clearing existing data...");
    const tables = targetDatabase
      .query<{ name: string }, []>(MIGRATOR_SQL.listTables)
      .all();
    const virtualTableNames = getVirtualTableNames(targetDatabase);

    for (const table of tables) {
      if (shouldSkipTableClear(table.name, virtualTableNames)) {
        continue;
      }
      console.log(`  Clearing ${table.name}...`);
      targetDatabase.run(getDeleteAllRowsQuery(table.name));
    }
    console.log("✅ Tables cleared");

    clearStatementCache();
    console.log(
      `🔎 Federated search body limit: ${federatedSearchBodyMaxChars === null ? "unlimited" : `${federatedSearchBodyMaxChars} chars`}`,
    );

    let tablesCompleted = 0;
    const startTime = Date.now();

    for (const tableName of tablesToImport) {
      if (checkStop()) {
        throw new Error("Migration stopped by user");
      }

      const tableStartTime = Date.now();

      console.log(`\n📊 Importing ${tableName}...`);
      onMessage({
        type: "progress",
        data: {
          message: `Importing ${tableName}...`,
          currentTable: tableName,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });

      if (tableName === "VaskiData") {
        let totalDocumentTypes = 0;
        let rowsImported = 0;

        targetDatabase.run(MIGRATOR_SQL.beginTransaction);

        try {
          const summary = await migrateVaskiData(targetDatabase, {
            shouldStop: checkStop,
            documentTypeProgressRowInterval: 5000,
            onDocumentTypeStart: ({ documentType, index, total }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Importing ${tableName}/${documentType} (${index}/${total})...`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index - 1,
                  totalDocumentTypes: total,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeProgress: ({
              documentType,
              index,
              total,
              rowsMigrated,
            }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Importing ${tableName}/${documentType} (${index}/${total}) - ${rowsMigrated} rows`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index - 1,
                  totalDocumentTypes: total,
                  rowsInCurrentDocumentType: rowsMigrated,
                  rowsImported: rowsImported + rowsMigrated,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeComplete: ({
              documentType,
              index,
              total,
              rowsMigrated,
            }) => {
              totalDocumentTypes = total;
              rowsImported += rowsMigrated;
              onMessage({
                type: "progress",
                data: {
                  message: `Imported ${tableName}/${documentType} (${index}/${total}) - ${rowsMigrated} rows`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index,
                  totalDocumentTypes: total,
                  rowsImported,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeSkipped: ({ documentType, index, total, reason }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Skipping ${tableName}/${documentType} (${index}/${total}) - ${reason}`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index,
                  totalDocumentTypes: total,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
          });

          rowsImported = Object.values(summary.rowsByDocumentType).reduce(
            (sum, value) => sum + value,
            0,
          );

          targetDatabase.run(MIGRATOR_SQL.commit);

          const tableTime = ((Date.now() - tableStartTime) / 1000).toFixed(2);
          const rowsPerSecond = (
            rowsImported / Math.max(parseFloat(tableTime), 0.001)
          ).toFixed(0);
          console.log(
            `✅ Imported ${rowsImported} rows from ${tableName} in ${tableTime}s (${rowsPerSecond} rows/s)`,
          );
          console.log(
            `   Migrated document types: ${summary.migratedDocumentTypes.length}, skipped: ${summary.skippedDocumentTypes.length}, total requested: ${summary.requestedDocumentTypes.length}`,
          );

          onMessage({
            type: "progress",
            data: {
              message: `Completed ${tableName} (${summary.requestedDocumentTypes.length} processed, ${summary.migratedDocumentTypes.length} migrated, ${summary.skippedDocumentTypes.length} skipped)`,
              currentTable: tableName,
              currentDocumentType: null,
              documentTypesCompleted:
                totalDocumentTypes || summary.requestedDocumentTypes.length,
              totalDocumentTypes:
                totalDocumentTypes || summary.requestedDocumentTypes.length,
              rowsImported,
              tablesCompleted,
              totalTables: tablesToImport.length,
            },
          });
        } catch (error) {
          targetDatabase.run(MIGRATOR_SQL.rollback);
          throw error;
        }

        tablesCompleted++;

        onMessage({
          type: "progress",
          data: {
            message: `Completed ${tableName}`,
            currentTable: tableName,
            currentDocumentType: null,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });

        continue;
      }

      // Standard table migrator
      const migratorModule = TABLE_MIGRATORS[tableName];

      if (migratorModule) {
        const migrator = migratorModule.default(targetDatabase);
        let rowsImported = 0;
        let pagesProcessed = 0;

        targetDatabase.run(MIGRATOR_SQL.beginTransaction);

        try {
          for await (const rows of readParsedData(tableName)) {
            if (checkStop()) {
              throw new Error("Migration stopped by user");
            }

            pagesProcessed++;

            for (const row of rows) {
              const rowForMigrator = { ...row };

              // Handle XmlDataFi field specifically (used in MemberOfParliament)
              if (
                rowForMigrator.XmlDataFi &&
                typeof rowForMigrator.XmlDataFi === "object"
              ) {
                rowForMigrator.XmlDataFi = JSON.stringify(
                  rowForMigrator.XmlDataFi,
                );
              }

              const result = migrator(rowForMigrator);
              if (isPromiseLike(result)) {
                await result;
              }
              rowsImported++;

              // Report progress every 5000 rows to reduce overhead
              if (rowsImported % 5000 === 0) {
                onMessage({
                  type: "progress",
                  data: {
                    message: `Importing ${tableName}... (${rowsImported} rows)`,
                    currentTable: tableName,
                    tablesCompleted,
                    totalTables: tablesToImport.length,
                    rowsImported,
                  },
                });
              }
            }

            // Log progress every 20 pages to reduce console spam
            if (pagesProcessed % 20 === 0) {
              console.log(
                `  Processed ${pagesProcessed} pages (${rowsImported} rows total)`,
              );
            }
          }

          // Flush any remaining batched rows (if migrator has flush function)
          if (migratorModule.flushVotes) {
            const result = migratorModule.flushVotes();
            if (isPromiseLike(result)) {
              await result;
            }
          }

          targetDatabase.run(MIGRATOR_SQL.commit);

          const tableTime = ((Date.now() - tableStartTime) / 1000).toFixed(2);
          const rowsPerSecond = (rowsImported / parseFloat(tableTime)).toFixed(
            0,
          );
          console.log(
            `✅ Imported ${rowsImported} rows from ${tableName} in ${tableTime}s (${rowsPerSecond} rows/s)`,
          );
        } catch (error) {
          targetDatabase.run(MIGRATOR_SQL.rollback);
          throw error;
        }
      } else {
        console.warn(`⚠️  No migrator found for ${tableName}, skipping...`);
      }

      tablesCompleted++;

      onMessage({
        type: "progress",
        data: {
          message: `Completed ${tableName}`,
          currentTable: tableName,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
    }

    onMessage({
      type: "progress",
      data: {
        message: "Normalizing imported text values...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("\n🧹 Normalizing imported text values...");
    normalizeImportedTextData(targetDatabase);
    console.log("✅ Text normalization complete");

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding voting-party aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding voting-party aggregate table...");
    const votingPartyStatsRows = rebuildVotingPartyStats(targetDatabase);
    console.log(
      `✅ Voting-party aggregate table rebuilt (${votingPartyStatsRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding person-voting aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding person-voting aggregate table...");
    const personVotingRows = rebuildPersonVotingDailyStats(targetDatabase);
    console.log(
      `✅ Person-voting aggregate table rebuilt (${personVotingRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding person-speech aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding person-speech aggregate table...");
    const personSpeechRows = rebuildPersonSpeechDailyStats(targetDatabase);
    console.log(
      `✅ Person-speech aggregate table rebuilt (${personSpeechRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding federated search index...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🔎 Rebuilding federated search index...");
    const federatedSearchRows = rebuildFederatedSearchIndex(
      targetDatabase,
      federatedSearchBodyMaxChars,
    );
    console.log(
      `✅ Federated search index rebuilt (${federatedSearchRows} rows)`,
    );

    console.log("\n📋 Generating changes report...");
    await generateAndSaveChangesReport(previousRebuildAt);

    await rebuildTraceDatabase();

    const timestamp = new Date().toISOString();
    targetDatabase.run(MIGRATOR_SQL.createMigrationInfoTable);
    targetDatabase.run(MIGRATOR_SQL.upsertMigrationTimestamp, [timestamp]);

    console.log("\n⚙️  Re-enabling safety features...");
    if (useExclusiveLock) {
      targetDatabase.run(SQLITE_PRAGMAS.lockingModeNormal);
    }
    targetDatabase.run(SQLITE_PRAGMAS.synchronousFull);
    console.log("💾 Flushing WAL checkpoint...");
    targetDatabase.run("PRAGMA wal_checkpoint(TRUNCATE);");

    if (shouldVacuumAfterImport) {
      onMessage({
        type: "progress",
        data: {
          message: "Compacting database file (VACUUM)...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      const databasePath = getDatabasePath();
      const sizeBeforeBytes = fs.existsSync(databasePath)
        ? fs.statSync(databasePath).size
        : 0;
      console.log("🗜️  Running VACUUM to compact database file...");
      targetDatabase.run("VACUUM;");
      const sizeAfterBytes = fs.existsSync(databasePath)
        ? fs.statSync(databasePath).size
        : 0;
      const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
      console.log(
        `✅ VACUUM complete (${toMb(sizeBeforeBytes)} MB -> ${toMb(sizeAfterBytes)} MB)`,
      );
    } else {
      console.log("⏭️  Skipping VACUUM (MIGRATOR_VACUUM_AFTER_IMPORT disabled)");
    }

    console.log("✅ Safety features restored");
    targetDatabase.close();

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration completed successfully in ${totalTime}s!`);
    console.log(`   Tables imported: ${tablesToImport.length}`);
    console.log(`   Timestamp: ${timestamp}`);

    onMessage({
      type: "complete",
      data: {
        message: `Migration completed successfully in ${totalTime}s`,
        tablesImported: tablesToImport.length,
        timestamp,
        totalTime,
      },
    });
  } catch (error: any) {
    if (checkStop()) {
      onMessage({
        type: "stopped",
        data: { message: "Migration stopped by user" },
      });
    } else {
      onMessage({
        type: "error",
        data: { error: error?.message ?? String(error) },
      });
    }
    throw error;
  }
}

/**
 * Get last migration timestamp from database.
 */
export function getLastMigrationTimestamp(): string | null {
  try {
    const db = sqlite.open(getDatabasePath(), { readonly: true });
    const result = db
      .query<{ value: string }, []>(
        `SELECT value FROM _migration_info WHERE key = 'last_migration'`,
      )
      .get();
    db.close();
    return result?.value || null;
  } catch (_error) {
    return null;
  }
}

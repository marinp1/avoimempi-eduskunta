import sqlite, { type Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { ServerWebSocket } from "bun";
import { getMigrations } from "bun-sqlite-migrations";
import { TableName } from "#constants/index";
import { clearStatementCache } from "../datapipe/migrator/utils";
import { getDatabasePath } from "../shared/database";
import { getStorage, StorageKeyBuilder } from "../shared/storage";
import {
  getDeleteAllRowsQuery,
  MIGRATOR_SQL,
  SQLITE_PRAGMAS,
} from "./database/sql-statements";

type SqlMigration = {
  version: number;
  up: string[];
  down: string;
};

export interface MigratorStatus {
  isRunning: boolean;
  currentTable: string | null;
  progress: number;
  totalTables: number;
}

export interface MigratorMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

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
  "VaskiData",
  "SaliDBAanestysAsiakirja",
  "SaliDBAanestysJakauma",
]);

const getDatabaseVersion = (db: Database): number => {
  const row = db.query("PRAGMA user_version;").get() as
    | { user_version?: number }
    | undefined;
  return row?.user_version ?? 0;
};

const setDatabaseVersion = (db: Database, version: number): void => {
  db.exec(`PRAGMA user_version = ${version}`);
};

const unquoteIdentifier = (identifier: string): string => {
  const trimmed = identifier.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.substring(1, trimmed.length - 1);
  }
  return trimmed;
};

const hasColumn = (
  db: Database,
  tableName: string,
  columnName: string,
): boolean => {
  const escaped = tableName.replace(/'/g, "''");
  const rows = db.query(`PRAGMA table_info('${escaped}')`).all() as Array<{
    name?: string;
  }>;
  return rows.some((row) => row.name === columnName);
};

const objectExists = (
  db: Database,
  type: "table" | "index" | "trigger",
  name: string,
): boolean => {
  const row = db
    .query(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = $type AND name = $name LIMIT 1",
    )
    .get({
      $type: type,
      $name: name,
    }) as { exists_flag?: number } | undefined;
  return !!row?.exists_flag;
};

const shouldSkipStatement = (
  db: Database,
  statement: string,
): { skip: boolean; reason?: string } => {
  const sql = statement.trim();
  if (!sql) return { skip: true, reason: "empty statement" };

  const normalized = sql.replace(/\s+/g, " ").trim();

  const alterAddColumn = normalized.match(
    /^ALTER TABLE\s+([`"[\]\w.]+)\s+ADD COLUMN\s+([`"[\]\w.]+)/i,
  );
  if (alterAddColumn) {
    const tableName = unquoteIdentifier(alterAddColumn[1]);
    const columnName = unquoteIdentifier(alterAddColumn[2]);
    if (hasColumn(db, tableName, columnName)) {
      return {
        skip: true,
        reason: `column ${tableName}.${columnName} already exists`,
      };
    }
    return { skip: false };
  }

  const createVirtualTable = normalized.match(
    /^CREATE VIRTUAL TABLE(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createVirtualTable) {
    const tableName = unquoteIdentifier(createVirtualTable[1]);
    if (objectExists(db, "table", tableName)) {
      return {
        skip: true,
        reason: `virtual table ${tableName} already exists`,
      };
    }
    return { skip: false };
  }

  const createTrigger = normalized.match(
    /^CREATE TRIGGER(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createTrigger) {
    const triggerName = unquoteIdentifier(createTrigger[1]);
    if (objectExists(db, "trigger", triggerName)) {
      return {
        skip: true,
        reason: `trigger ${triggerName} already exists`,
      };
    }
    return { skip: false };
  }

  const createIndex = normalized.match(
    /^CREATE INDEX(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createIndex) {
    const indexName = unquoteIdentifier(createIndex[1]);
    if (objectExists(db, "index", indexName)) {
      return {
        skip: true,
        reason: `index ${indexName} already exists`,
      };
    }
    return { skip: false };
  }

  return { skip: false };
};

const applyMigrationsSafely = (
  db: Database,
  migrations: SqlMigration[],
): void => {
  const orderedMigrations = [...migrations].sort((a, b) => a.version - b.version);
  if (orderedMigrations.length === 0) {
    return;
  }

  const maxVersion = orderedMigrations[orderedMigrations.length - 1].version;
  let currentVersion = getDatabaseVersion(db);

  if (currentVersion > maxVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than available migrations (${maxVersion})`,
    );
  }

  for (const migration of orderedMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    const runUpgrade = db.transaction(() => {
      for (const statement of migration.up) {
        const skipCheck = shouldSkipStatement(db, statement);
        if (skipCheck.skip) {
          console.log(
            `  Skipping v${migration.version} statement: ${skipCheck.reason ?? "already applied"}`,
          );
          continue;
        }

        try {
          db.run(statement);
        } catch (error) {
          const snippet =
            statement
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) ?? statement;
          throw new Error(
            `Migration v${migration.version} failed on statement "${snippet}": ${String(error)}`,
          );
        }
      }
      setDatabaseVersion(db, migration.version);
    });

    runUpgrade.immediate();
    currentVersion = migration.version;
  }
};

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
  if (tableName === "sqlite_sequence" || tableName === "_bun_migrations") {
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

/**
 * Controller for managing database migration from parsed storage
 */
export class MigratorController {
  private static instance: MigratorController | null = null;
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private ws: ServerWebSocket<unknown> | null = null;

  private constructor() {}

  static getInstance(): MigratorController {
    if (!MigratorController.instance) {
      MigratorController.instance = new MigratorController();
    }
    return MigratorController.instance;
  }

  setWebSocket(ws: ServerWebSocket<unknown>) {
    this.ws = ws;
  }

  getStatus(): MigratorStatus {
    return {
      isRunning: this.isRunning,
      currentTable: this.currentTable,
      progress: 0,
      totalTables: 0,
    };
  }

  private sendMessage(message: MigratorMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get ordered list of tables to import
   */
  private getOrderedTables(): string[] {
    const allTables = Object.values(TableName) as string[];
    return allTables.sort(
      (a, b) =>
        (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
        (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Check which tables have parsed data available
   */
  private async getTablesWithParsedData(): Promise<string[]> {
    const storage = getStorage();
    const allTables = this.getOrderedTables().filter(
      (tableName) => !DISABLED_IMPORT_TABLES.has(tableName),
    );
    const tablesWithData: string[] = [];

    for (const tableName of allTables) {
      const prefix = StorageKeyBuilder.listPrefixForTable("parsed", tableName);
      const result = await storage.list({ prefix, maxKeys: 1 });
      if (result.keys.length > 0) {
        tablesWithData.push(tableName);
      }
    }

    return tablesWithData;
  }

  /**
   * Read all parsed pages for a table
   */
  private async *readParsedData(tableName: string): AsyncGenerator<any[]> {
    const storage = getStorage();
    const prefix = StorageKeyBuilder.listPrefixForTable("parsed", tableName);
    const listResult = await storage.list({ prefix, maxKeys: 100000 });

    // Sort pages by page number
    const sortedPages = listResult.keys
      .map((k) => ({ key: k, parsed: StorageKeyBuilder.parseKey(k.key) }))
      .filter((p) => p.parsed !== null)
      .sort((a, b) => (a.parsed?.page || 0) - (b.parsed?.page || 0));

    for (const pageInfo of sortedPages) {
      const data = await storage.get(pageInfo.key.key);
      if (data) {
        const pageData = JSON.parse(data) as { rowData: any[] };
        yield pageData.rowData;
      }
    }
  }

  /**
   * Start database migration from parsed storage
   */
  async startMigration() {
    if (this.isRunning) {
      throw new Error("Migration is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;

    this.sendMessage({
      type: "status",
      data: {
        status: "started",
        message: "Starting database migration",
      },
    });

    try {
      // Get tables with parsed data
      const tablesToImport = await this.getTablesWithParsedData();

      if (tablesToImport.length === 0) {
        throw new Error("No parsed data found to migrate");
      }

      this.sendMessage({
        type: "progress",
        data: {
          message: `Found ${tablesToImport.length} tables to import`,
          currentTable: null,
          tablesCompleted: 0,
          totalTables: tablesToImport.length,
        },
      });

      // Open target database
      const targetDatabase = sqlite.open(getDatabasePath(), {
        create: true,
        readwrite: true,
      });

      targetDatabase.exec(SQLITE_PRAGMAS.journalWal);

      // Apply performance optimizations for bulk inserts
      console.log("⚙️  Applying SQLite performance optimizations...");
      targetDatabase.exec(SQLITE_PRAGMAS.synchronousOff); // Disable sync for speed (data can be regenerated)
      targetDatabase.exec(SQLITE_PRAGMAS.cacheSize64Mb); // 64MB cache
      targetDatabase.exec(SQLITE_PRAGMAS.tempStoreMemory); // Keep temp data in memory
      targetDatabase.exec(SQLITE_PRAGMAS.mmapSize30Gb); // Use memory-mapped I/O

      // Run migrations
      const migrationsPath = path.resolve(
        import.meta.dirname,
        "../datapipe/migrator/migrations",
      );
      console.log("🔄 Running database migrations...");
      applyMigrationsSafely(
        targetDatabase,
        getMigrations(migrationsPath) as SqlMigration[],
      );
      console.log("✅ Migrations completed");

      // Clear all tables
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

      // Clear prepared statement cache before starting
      clearStatementCache();

      // Import each table
      let tablesCompleted = 0;
      const startTime = Date.now();

      for (const tableName of tablesToImport) {
        if (this.shouldStop) {
          throw new Error("Migration stopped by user");
        }

        this.currentTable = tableName;
        const tableStartTime = Date.now();

        console.log(`\n📊 Importing ${tableName}...`);
        this.sendMessage({
          type: "progress",
          data: {
            message: `Importing ${tableName}...`,
            currentTable: tableName,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });

        // Check if migrator exists
        const migratorPath = path.resolve(
          import.meta.dirname,
          `../datapipe/migrator/${tableName}/migrator.ts`,
        );

        if (fs.existsSync(migratorPath)) {
          // Dynamic import the migrator
          const migratorModule = (await import(migratorPath)) as {
            default: (sql: Database) => (data: any) => Promise<void>;
            flushVotes?: () => void;
          };

          const migrator = migratorModule.default(targetDatabase);
          let rowsImported = 0;
          let pagesProcessed = 0;

          // Start a single transaction for the entire table
          targetDatabase.exec(MIGRATOR_SQL.beginTransaction);

          try {
            // Read and import data
            for await (const rows of this.readParsedData(tableName)) {
              if (this.shouldStop) {
                throw new Error("Migration stopped by user");
              }

              pagesProcessed++;

              for (const row of rows) {
                // Convert parsed object fields back to JSON strings for the migrator
                // The old migrator expects fields like XmlDataFi to be JSON strings
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

                await migrator(rowForMigrator);
                rowsImported++;

                // Report progress every 5000 rows to reduce overhead
                if (rowsImported % 5000 === 0) {
                  this.sendMessage({
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
              migratorModule.flushVotes();
            }

            // Commit the transaction
            targetDatabase.exec(MIGRATOR_SQL.commit);

            const tableTime = ((Date.now() - tableStartTime) / 1000).toFixed(2);
            const rowsPerSecond = (
              rowsImported / parseFloat(tableTime)
            ).toFixed(0);
            console.log(
              `✅ Imported ${rowsImported} rows from ${tableName} in ${tableTime}s (${rowsPerSecond} rows/s)`,
            );
          } catch (error) {
            // Rollback on error
            targetDatabase.exec(MIGRATOR_SQL.rollback);
            throw error;
          }
        } else {
          console.warn(`⚠️  No migrator found for ${tableName}, skipping...`);
        }

        tablesCompleted++;

        this.sendMessage({
          type: "progress",
          data: {
            message: `Completed ${tableName}`,
            currentTable: tableName,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });
      }

      // Update database timestamp
      const timestamp = new Date().toISOString();
      targetDatabase.run(MIGRATOR_SQL.createMigrationInfoTable);
      targetDatabase.run(MIGRATOR_SQL.upsertMigrationTimestamp, [timestamp]);

      // Re-enable safety features
      console.log("\n⚙️  Re-enabling safety features...");
      targetDatabase.exec(SQLITE_PRAGMAS.synchronousFull);
      console.log("✅ Safety features restored");

      targetDatabase.close();

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n🎉 Migration completed successfully in ${totalTime}s!`);
      console.log(`   Tables imported: ${tablesToImport.length}`);
      console.log(`   Timestamp: ${timestamp}`);

      this.sendMessage({
        type: "complete",
        data: {
          message: `Migration completed successfully in ${totalTime}s`,
          tablesImported: tablesToImport.length,
          timestamp,
          totalTime,
        },
      });
    } catch (error: any) {
      if (this.shouldStop) {
        this.sendMessage({
          type: "stopped",
          data: {
            message: "Migration stopped by user",
          },
        });
      } else {
        this.sendMessage({
          type: "error",
          data: {
            error: error.message,
          },
        });
      }
      throw error;
    } finally {
      this.isRunning = false;
      this.currentTable = null;
      this.shouldStop = false;
    }
  }

  stopMigration() {
    if (!this.isRunning) {
      throw new Error("No migration is currently running");
    }

    this.shouldStop = true;
    this.sendMessage({
      type: "status",
      data: {
        status: "stopping",
        message: "Stopping migration...",
      },
    });
  }

  /**
   * Get last migration timestamp from database
   */
  static getLastMigrationTimestamp(): string | null {
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
}

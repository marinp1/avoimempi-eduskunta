import sqlite, { type Database } from "bun:sqlite";
import fs from "node:fs";
import path from "node:path";
import type { ServerWebSocket } from "bun";
import { getMigrations, migrate } from "bun-sqlite-migrations";
import { TableName } from "#constants/index";
import { clearStatementCache } from "../datapipe/migrator/utils";
import { getDatabasePath } from "../shared/database";
import { getStorage, StorageKeyBuilder } from "../shared/storage";
import {
  MIGRATOR_SQL,
  SQLITE_PRAGMAS,
  getDeleteAllRowsQuery,
} from "./database/sql-statements";

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
  SaliDBAanestysAsiakirja: 24,
  SaliDBAanestysJakauma: 25,
  SaliDBAanestysEdustaja: 30,
  VaskiData: 40,
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
    const allTables = this.getOrderedTables();
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
      migrate(targetDatabase, getMigrations(migrationsPath));
      console.log("✅ Migrations completed");

      // Clear all tables
      console.log("🗑️  Clearing existing data...");
      const tables = targetDatabase
        .query<{ name: string }, []>(
          MIGRATOR_SQL.listTables,
        )
        .all();

      for (const table of tables) {
        if (
          table.name !== "sqlite_sequence" &&
          table.name !== "_bun_migrations"
        ) {
          console.log(`  Clearing ${table.name}...`);
          targetDatabase.run(getDeleteAllRowsQuery(table.name));
        }
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

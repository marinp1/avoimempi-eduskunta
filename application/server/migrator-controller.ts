import path from "path";
import sqlite, { type Database } from "bun:sqlite";
import type { ServerWebSocket } from "bun";
import { getStorage, StorageKeyBuilder } from "../../shared/storage";
import { TableName } from "#constants/index";
import { getDatabasePath } from "../../shared/database";
import { getMigrations, migrate } from "bun-sqlite-migrations";
import fs from "fs";

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
  SaliDBAanestys: 20,
  SaliDBKohtaAanestys: 21,
  SaliDBAanestysEdustaja: 30,
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
    if (!this.instance) {
      this.instance = new MigratorController();
    }
    return this.instance;
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
        (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER)
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

      targetDatabase.exec("PRAGMA journal_mode = WAL;");

      // Run migrations
      const migrationsPath = path.resolve(
        import.meta.dirname,
        "../../datapipe/migrator/migrations"
      );
      migrate(targetDatabase, getMigrations(migrationsPath));

      // Clear all tables
      const tables = targetDatabase
        .query<{ name: string }, []>(
          "SELECT name FROM sqlite_master WHERE type='table';"
        )
        .all();

      for (const table of tables) {
        if (table.name !== "sqlite_sequence" && table.name !== "_bun_migrations") {
          targetDatabase.run(`DELETE FROM ${table.name};`);
        }
      }

      // Import each table
      let tablesCompleted = 0;

      for (const tableName of tablesToImport) {
        if (this.shouldStop) {
          throw new Error("Migration stopped by user");
        }

        this.currentTable = tableName;

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
          `../../datapipe/migrator/${tableName}/migrator.ts`
        );

        if (fs.existsSync(migratorPath)) {
          // Dynamic import the migrator
          const { default: createMigrator } = (await import(migratorPath)) as {
            default: (sql: Database) => (data: any) => Promise<void>;
          };

          const migrator = createMigrator(targetDatabase);
          let rowsImported = 0;

          // Read and import data
          for await (const rows of this.readParsedData(tableName)) {
            if (this.shouldStop) {
              throw new Error("Migration stopped by user");
            }

            for (const row of rows) {
              // Convert parsed object fields back to JSON strings for the migrator
              // The old migrator expects fields like XmlDataFi to be JSON strings
              const rowForMigrator = { ...row };

              // Handle XmlDataFi field specifically (used in MemberOfParliament)
              if (rowForMigrator.XmlDataFi && typeof rowForMigrator.XmlDataFi === 'object') {
                rowForMigrator.XmlDataFi = JSON.stringify(rowForMigrator.XmlDataFi);
              }

              targetDatabase.exec("BEGIN TRANSACTION;");
              await migrator(rowForMigrator);
              targetDatabase.exec("COMMIT;");
              rowsImported++;
            }
          }

          console.log(`✅ Imported ${rowsImported} rows from ${tableName}`);
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
      targetDatabase.run(
        `CREATE TABLE IF NOT EXISTS _migration_info (key TEXT PRIMARY KEY, value TEXT);`
      );
      targetDatabase.run(
        `INSERT OR REPLACE INTO _migration_info (key, value) VALUES ('last_migration', ?);`,
        [timestamp]
      );

      targetDatabase.close();

      this.sendMessage({
        type: "complete",
        data: {
          message: `Migration completed successfully`,
          tablesImported: tablesToImport.length,
          timestamp,
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
          `SELECT value FROM _migration_info WHERE key = 'last_migration'`
        )
        .get();
      db.close();
      return result?.value || null;
    } catch (error) {
      return null;
    }
  }
}

import { Database } from "bun:sqlite";
import { getRawDatabasePath, getParsedDatabasePath } from "#database";
import { statSync } from "fs";

export class AdminDatabaseConnection {
  private rawDb: Database | null = null;
  private parsedDb: Database | null = null;

  constructor() {
    try {
      this.rawDb = new Database(getRawDatabasePath(), { readonly: true });
      this.rawDb.exec("PRAGMA journal_mode = WAL;");
    } catch (error) {
      console.warn("Raw database not found or cannot be opened:", error);
    }

    try {
      this.parsedDb = new Database(getParsedDatabasePath(), { readonly: true });
      this.parsedDb.exec("PRAGMA journal_mode = WAL;");
    } catch (error) {
      console.warn("Parsed database not found or cannot be opened:", error);
    }
  }

  /**
   * Get all table names from a database
   */
  private getTableNames(db: Database | null): string[] {
    if (!db) return [];

    try {
      const tables = db
        .query<{ name: string }, []>(
          "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
        )
        .all();
      return tables.map((t) => t.name);
    } catch (error) {
      console.error("Error fetching table names:", error);
      return [];
    }
  }

  /**
   * Get row count for a table
   */
  private getTableCount(db: Database | null, tableName: string): number {
    if (!db) return 0;

    try {
      const result = db
        .query<{ count: number }, []>(`SELECT COUNT(*) as count FROM "${tableName}"`)
        .get();
      return result?.count ?? 0;
    } catch (error) {
      console.error(`Error counting rows in ${tableName}:`, error);
      return 0;
    }
  }

  /**
   * Check if a table exists in a database
   */
  private tableExists(db: Database | null, tableName: string): boolean {
    if (!db) return false;

    try {
      const result = db
        .query<{ count: number }, [string]>(
          "SELECT COUNT(*) as count FROM sqlite_master WHERE type='table' AND name = ?"
        )
        .get(tableName);
      return (result?.count ?? 0) > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get the last modified timestamp for a database file
   */
  private getDatabaseFileTimestamp(dbPath: string | null): string | null {
    if (!dbPath) return null;

    try {
      const stats = statSync(dbPath);
      return stats.mtime.toISOString();
    } catch (error) {
      console.error(`Error getting file timestamp for ${dbPath}:`, error);
      return null;
    }
  }

  /**
   * Get status for all tables
   */
  async getStatus(): Promise<
    Array<{
      table_name: string;
      raw_count: number;
      parsed_count: number;
      has_raw_data: boolean;
      has_parsed_data: boolean;
      raw_last_updated: string | null;
      parsed_last_updated: string | null;
    }>
  > {
    // Get all unique table names from both databases
    const rawTables = this.getTableNames(this.rawDb);
    const parsedTables = this.getTableNames(this.parsedDb);
    const allTables = [...new Set([...rawTables, ...parsedTables])].sort();

    // Get database file timestamps (all tables in same DB have same timestamp)
    const rawTimestamp = this.getDatabaseFileTimestamp(getRawDatabasePath());
    const parsedTimestamp = this.getDatabaseFileTimestamp(getParsedDatabasePath());

    const status = allTables.map((tableName) => {
      const hasRaw = this.tableExists(this.rawDb, tableName);
      const hasParsed = this.tableExists(this.parsedDb, tableName);

      return {
        table_name: tableName,
        raw_count: hasRaw ? this.getTableCount(this.rawDb, tableName) : 0,
        parsed_count: hasParsed ? this.getTableCount(this.parsedDb, tableName) : 0,
        has_raw_data: hasRaw,
        has_parsed_data: hasParsed,
        raw_last_updated: hasRaw ? rawTimestamp : null,
        parsed_last_updated: hasParsed ? parsedTimestamp : null,
      };
    });

    return status;
  }

  close() {
    try {
      this.rawDb?.close();
      this.parsedDb?.close();
    } catch (error) {
      console.error("Error closing admin database connections:", error);
    }
  }
}

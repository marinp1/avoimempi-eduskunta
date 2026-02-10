// Status controller for public-facing data quality dashboard

import { DatabaseConnection } from "../database/db";
import {
  STATUS_TABLES,
  getStatusTableCountQuery,
  getStatusTableInfoQuery,
  isStatusTableName,
} from "../database/status-queries";
import {
  SanityCheckService,
  type SanityCheckResult,
} from "../services/sanity-checks";

export interface TableStatus {
  tableName: string;
  rowCount: number;
  hasData: boolean;
}

export interface DataOverview {
  tables: TableStatus[];
  totalTables: number;
  tablesWithData: number;
  lastUpdated: string;
}

export class StatusController {
  private sanityCheckService: SanityCheckService;
  private cachedOverview: DataOverview | null = null;
  private cachedSanityChecks: SanityCheckResult | null = null;

  constructor(private db: DatabaseConnection) {
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  private get database() {
    // Access the internal database connection
    return (this.db as any)["db"] as import("bun:sqlite").Database;
  }

  /** Clear cached results. Call after database rebuild. */
  invalidateCache(): void {
    this.cachedOverview = null;
    this.cachedSanityChecks = null;
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  async getSanityChecks(): Promise<SanityCheckResult> {
    if (!this.cachedSanityChecks) {
      this.cachedSanityChecks =
        await this.sanityCheckService.runAllChecks();
    }
    return this.cachedSanityChecks;
  }

  async getOverview(): Promise<DataOverview> {
    if (this.cachedOverview) {
      return this.cachedOverview;
    }

    const tableStatuses: TableStatus[] = [];

    for (const tableName of STATUS_TABLES) {
      try {
        const stmt = this.database.prepare<{ count: number }, []>(
          getStatusTableCountQuery(tableName),
        );
        const row = stmt.get();
        stmt.finalize();
        const rowCount = row?.count ?? 0;

        tableStatuses.push({
          tableName,
          rowCount,
          hasData: rowCount > 0,
        });
      } catch (error) {
        console.error(`Error querying table ${tableName}:`, error);
        tableStatuses.push({
          tableName,
          rowCount: 0,
          hasData: false,
        });
      }
    }

    const tablesWithData = tableStatuses.filter((t) => t.hasData).length;

    this.cachedOverview = {
      tables: tableStatuses,
      totalTables: STATUS_TABLES.length,
      tablesWithData,
      lastUpdated: new Date().toISOString(),
    };

    return this.cachedOverview;
  }

  async getTableDetails(tableName: string) {
    if (!isStatusTableName(tableName)) {
      throw new Error(`Invalid table name: ${tableName}`);
    }

    const countStmt = this.database.prepare<{ count: number }, []>(
      getStatusTableCountQuery(tableName),
    );
    const countRow = countStmt.get();
    countStmt.finalize();
    const rowCount = countRow?.count ?? 0;

    // Get column info
    const columnsStmt = this.database.prepare<
      {
        name: string;
        type: string;
        notnull: number;
      },
      []
    >(getStatusTableInfoQuery(tableName));
    const columns = columnsStmt.all();
    columnsStmt.finalize();

    return {
      tableName,
      rowCount,
      columns,
    };
  }
}

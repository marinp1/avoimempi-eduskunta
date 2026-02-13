// Status controller for public-facing data quality dashboard

import { AdminStorageService } from "../database/admin-storage";
import type { DatabaseConnection } from "../database/db";
import {
  getStatusTableCountQuery,
  getStatusTableInfoQuery,
  getStatusTableNamesQuery,
} from "../database/status-queries";
import {
  type SanityCheckResult,
  SanityCheckService,
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

export interface SourceTableStatus {
  tableName: string;
  apiRowCount: number;
  rawRows: number;
  parsedRows: number;
  rawPages: number;
  parsedPages: number;
  hasRawData: boolean;
  hasParsedData: boolean;
  rawLastUpdated: string | null;
  parsedLastUpdated: string | null;
  scrapeProgressPercent: number;
}

export interface SourceDataOverview {
  tables: SourceTableStatus[];
  totalTables: number;
  tablesWithRawData: number;
  tablesWithParsedData: number;
  lastUpdated: string;
}

export class StatusController {
  private adminStorageService: AdminStorageService;
  private sanityCheckService: SanityCheckService;
  private cachedSanityChecks: SanityCheckResult | null = null;

  constructor(private db: DatabaseConnection) {
    this.adminStorageService = new AdminStorageService();
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  private get database() {
    // Access the internal database connection
    return (this.db as any)["db"] as import("bun:sqlite").Database;
  }

  /** Clear cached results. Call after database rebuild. */
  invalidateCache(): void {
    this.cachedSanityChecks = null;
    this.sanityCheckService = new SanityCheckService(this.database);
  }

  async getSanityChecks(): Promise<SanityCheckResult> {
    if (!this.cachedSanityChecks) {
      this.cachedSanityChecks = await this.sanityCheckService.runAllChecks();
    }
    return this.cachedSanityChecks;
  }

  async getOverview(): Promise<DataOverview> {
    const tableNames = this.getTableNames();
    const tableStatuses: TableStatus[] = [];

    for (const tableName of tableNames) {
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

    return {
      tables: tableStatuses,
      totalTables: tableNames.length,
      tablesWithData,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getSourceDataStatus(): Promise<SourceDataOverview> {
    const storageStatus = await this.adminStorageService.getStatus();
    const tables = storageStatus.map((row) => ({
      tableName: row.table_name,
      apiRowCount: row.total_rows_in_api ?? 0,
      rawRows: row.raw_estimated_rows,
      parsedRows: row.parsed_estimated_rows,
      rawPages: row.raw_page_count,
      parsedPages: row.parsed_page_count,
      hasRawData: row.has_raw_data,
      hasParsedData: row.has_parsed_data,
      rawLastUpdated: row.raw_last_updated,
      parsedLastUpdated: row.parsed_last_updated,
      scrapeProgressPercent: row.scrape_progress_percent ?? 0,
    }));

    return {
      tables,
      totalTables: tables.length,
      tablesWithRawData: tables.filter((table) => table.hasRawData).length,
      tablesWithParsedData: tables.filter((table) => table.hasParsedData)
        .length,
      lastUpdated: new Date().toISOString(),
    };
  }

  async getTableDetails(tableName: string) {
    if (!this.getTableNames().includes(tableName)) {
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

  private getTableNames(): string[] {
    const stmt = this.database.prepare<{ name: string }, []>(
      getStatusTableNamesQuery(),
    );
    const rows = stmt.all();
    stmt.finalize();
    return rows.map((row) => row.name);
  }
}

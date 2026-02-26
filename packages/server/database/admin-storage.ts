import { TableName } from "#constants/index";
import { getStorage } from "#storage/factory";
import { listAllStorageKeys } from "#storage/list-all";
import {
  loadSourceStageStatusMap,
  type SourceStageStatusSnapshot,
} from "#storage/source-status";
import {
  type DataStage,
  StorageKeyBuilder,
  type StorageMetadata,
} from "#storage/types";
import { getCachedTableCountMapByRows } from "#table-counts";

export interface TableStorageStatus {
  table_name: string;
  raw_page_count: number;
  parsed_page_count: number;
  has_raw_data: boolean;
  has_parsed_data: boolean;
  raw_last_updated: string | null;
  parsed_last_updated: string | null;
  raw_estimated_rows: number;
  parsed_estimated_rows: number;
  total_rows_in_api?: number;
  scrape_progress_percent?: number;
}

export interface ScrapingOverview {
  total_tables: number;
  tables_with_data: number;
  tables_completed: number;
  total_api_rows: number;
  total_scraped_rows: number;
  overall_progress_percent: number;
  tables_with_parsed_data: number;
  tables_fully_parsed: number;
  total_parsed_rows: number;
}

export class AdminStorageService {
  private static statusCache: {
    data: TableStorageStatus[];
    expiresAt: number;
  } | null = null;
  private static statusFetchInFlight: Promise<TableStorageStatus[]> | null =
    null;
  private static readonly STATUS_CACHE_TTL = 30_000;
  private static readonly API_COUNTS_TIMEOUT_MS = 1_500;
  private static readonly API_COUNTS_CONCURRENCY = 5;
  private static readonly API_COUNTS_CACHE_TTL_MS = 60 * 60 * 1000;

  /**
   * Fetch table row counts from Eduskunta API
   */
  private async fetchApiTableCounts(options?: {
    tableNames?: string[];
    candidateRowCounts?: Record<string, number>;
  }): Promise<Record<string, number>> {
    const requestedTableNames = options?.tableNames;
    const allTableNames = this.getTableNames();
    const normalizedRequestedTableNames = requestedTableNames
      ? Array.from(new Set(requestedTableNames)).sort()
      : [];
    const isAllTablesRequest =
      normalizedRequestedTableNames.length === 0 ||
      (normalizedRequestedTableNames.length === allTableNames.length &&
        normalizedRequestedTableNames.every(
          (tableName, index) => tableName === allTableNames[index],
        ));
    const effectiveTableNames = isAllTablesRequest
      ? allTableNames
      : normalizedRequestedTableNames;

    return await getCachedTableCountMapByRows({
      tableNames: effectiveTableNames,
      candidateRowCounts: options?.candidateRowCounts,
      timeoutMs: AdminStorageService.API_COUNTS_TIMEOUT_MS,
      concurrency: AdminStorageService.API_COUNTS_CONCURRENCY,
      cacheTtlMs: AdminStorageService.API_COUNTS_CACHE_TTL_MS,
      useStaleWhileRefreshing: true,
      log: false,
    });
  }

  getTableNames(): string[] {
    return (Object.values(TableName) as string[]).sort();
  }

  private buildTableStatus(
    tableName: string,
    apiCounts: Record<string, number>,
    stageSnapshots: Record<string, SourceStageStatusSnapshot>,
  ): TableStorageStatus {
    const rawSnapshot =
      stageSnapshots[this.buildStageSnapshotKey("raw", tableName)];
    const parsedSnapshot =
      stageSnapshots[this.buildStageSnapshotKey("parsed", tableName)];

    const rawPageCount = rawSnapshot?.pageCount ?? 0;
    const parsedPageCount = parsedSnapshot?.pageCount ?? 0;
    const rawEstimatedRows = rawSnapshot
      ? this.estimateRowsFromSnapshot(rawSnapshot)
      : 0;
    const parsedEstimatedRows = parsedSnapshot
      ? this.estimateRowsFromSnapshot(parsedSnapshot)
      : 0;

    const totalRowsInApi = apiCounts[tableName] || 0;
    const effectiveTotal = Math.max(totalRowsInApi, rawEstimatedRows);
    const scrapeProgressPercent =
      effectiveTotal > 0
        ? Math.min((rawEstimatedRows / effectiveTotal) * 100, 100)
        : 0;

    return {
      table_name: tableName,
      raw_page_count: rawPageCount,
      parsed_page_count: parsedPageCount,
      has_raw_data: rawPageCount > 0,
      has_parsed_data: parsedPageCount > 0,
      raw_last_updated: rawSnapshot?.lastUpdated ?? null,
      parsed_last_updated: parsedSnapshot?.lastUpdated ?? null,
      raw_estimated_rows: rawEstimatedRows,
      parsed_estimated_rows: parsedEstimatedRows,
      total_rows_in_api: totalRowsInApi,
      scrape_progress_percent: scrapeProgressPercent,
    };
  }

  /**
   * Get all files for a specific stage and table
   */
  private async getTableFiles(
    stage: DataStage,
    tableName: string,
  ): Promise<StorageMetadata[]> {
    const storage = getStorage();
    const prefix = StorageKeyBuilder.listPrefixForTable(stage, tableName);

    try {
      return await listAllStorageKeys(storage, {
        prefix,
        pageSize: 10_000,
      });
    } catch (error) {
      console.error(`Error listing files for ${stage}/${tableName}:`, error);
      return [];
    }
  }

  /**
   * Get the most recent modification date from a list of files
   */
  private buildStageSnapshotKey(stage: DataStage, tableName: string): string {
    return `${stage}:${tableName}`;
  }

  private estimateRowsFromSnapshot(
    snapshot: SourceStageStatusSnapshot,
  ): number {
    if (snapshot.pageCount === 0) return 0;
    if (snapshot.totalRowCount > 0) return snapshot.totalRowCount;
    return (snapshot.pageCount - 1) * 100 + snapshot.lastPageRowCount;
  }

  private buildCandidateRowCounts(
    stageSnapshots: Record<string, SourceStageStatusSnapshot>,
    tableNames: string[],
  ): Record<string, number> {
    const candidates: Record<string, number> = {};

    for (const tableName of tableNames) {
      const rawSnapshot =
        stageSnapshots[this.buildStageSnapshotKey("raw", tableName)];
      const parsedSnapshot =
        stageSnapshots[this.buildStageSnapshotKey("parsed", tableName)];
      const preferredSnapshot = rawSnapshot ?? parsedSnapshot;

      if (preferredSnapshot) {
        candidates[tableName] =
          this.estimateRowsFromSnapshot(preferredSnapshot);
      }
    }

    return candidates;
  }

  /**
   * Get status for all tables
   */
  async getStatus(): Promise<TableStorageStatus[]> {
    const now = Date.now();
    if (
      AdminStorageService.statusCache &&
      AdminStorageService.statusCache.expiresAt > now
    ) {
      return AdminStorageService.statusCache.data;
    }

    if (AdminStorageService.statusFetchInFlight) {
      return AdminStorageService.statusFetchInFlight;
    }

    AdminStorageService.statusFetchInFlight = (async () => {
      const tables = this.getTableNames();
      const stageSnapshots = await loadSourceStageStatusMap();
      const candidateRowCounts = this.buildCandidateRowCounts(
        stageSnapshots,
        tables,
      );
      const apiCounts = await this.fetchApiTableCounts({
        tableNames: tables,
        candidateRowCounts,
      });
      const data = tables.map((tableName) =>
        this.buildTableStatus(tableName, apiCounts, stageSnapshots),
      );
      AdminStorageService.statusCache = {
        data,
        expiresAt: Date.now() + AdminStorageService.STATUS_CACHE_TTL,
      };
      return data;
    })();

    try {
      return await AdminStorageService.statusFetchInFlight;
    } finally {
      AdminStorageService.statusFetchInFlight = null;
    }
  }

  /**
   * Get detailed status for a specific table
   */
  async getTableStatus(tableName: string): Promise<TableStorageStatus | null> {
    if (!Object.values(TableName).includes(tableName as any)) {
      return null;
    }

    const stageSnapshots = await loadSourceStageStatusMap();
    const candidateRowCounts = this.buildCandidateRowCounts(stageSnapshots, [
      tableName,
    ]);
    const apiCounts = await this.fetchApiTableCounts({
      tableNames: [tableName],
      candidateRowCounts,
    });
    return this.buildTableStatus(tableName, apiCounts, stageSnapshots);
  }

  /**
   * Get list of available pages for a table
   */
  async getTablePages(tableName: string, stage: DataStage): Promise<number[]> {
    const files = await this.getTableFiles(stage, tableName);
    const firstPks: number[] = [];

    for (const file of files) {
      const parsed = StorageKeyBuilder.parseKey(file.key);
      if (parsed) {
        firstPks.push(parsed.firstPk);
      }
    }

    return firstPks.sort((a, b) => a - b);
  }

  /**
   * Get overall scraping and parsing progress overview
   */
  async getScrapingOverview(): Promise<ScrapingOverview> {
    const status = await this.getStatus();

    const totalTables = status.length;
    const tablesWithData = status.filter((s) => s.has_raw_data).length;
    const tablesCompleted = status.filter(
      (s) =>
        s.total_rows_in_api &&
        s.scrape_progress_percent &&
        s.scrape_progress_percent >= 99.9,
    ).length;

    const totalApiRows = status.reduce(
      (sum, s) => sum + (s.total_rows_in_api || 0),
      0,
    );
    const totalScrapedRows = status.reduce(
      (sum, s) => sum + s.raw_estimated_rows,
      0,
    );
    const overallProgressPercent =
      totalApiRows > 0
        ? Math.min((totalScrapedRows / totalApiRows) * 100, 100)
        : 0;

    // Parsed data statistics
    const tablesWithParsedData = status.filter((s) => s.has_parsed_data).length;
    const tablesFullyParsed = status.filter(
      (s) =>
        s.has_raw_data &&
        s.has_parsed_data &&
        s.parsed_page_count >= s.raw_page_count,
    ).length;
    const totalParsedRows = status.reduce(
      (sum, s) => sum + s.parsed_estimated_rows,
      0,
    );

    return {
      total_tables: totalTables,
      tables_with_data: tablesWithData,
      tables_completed: tablesCompleted,
      total_api_rows: totalApiRows,
      total_scraped_rows: totalScrapedRows,
      overall_progress_percent: overallProgressPercent,
      tables_with_parsed_data: tablesWithParsedData,
      tables_fully_parsed: tablesFullyParsed,
      total_parsed_rows: totalParsedRows,
    };
  }

  invalidateStatusCache(): void {
    AdminStorageService.statusCache = null;
  }
}

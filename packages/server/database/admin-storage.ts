import { TableName } from "#constants/index";
import { listAllStorageKeys } from "#storage/list-all";
import { getStorage } from "#storage/factory";
import {
  type DataStage,
  StorageKeyBuilder,
  type StorageMetadata,
} from "#storage/types";
import {
  loadSourceStageStatusMap,
  type SourceStageStatusSnapshot,
} from "#storage/source-status";

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
  private static cachedApiTableCounts: Record<string, number> | null = null;
  private static apiFetchInFlight: Promise<Record<string, number>> | null =
    null;
  private static statusCache:
    | { data: TableStorageStatus[]; expiresAt: number }
    | null = null;
  private static statusFetchInFlight: Promise<TableStorageStatus[]> | null =
    null;
  private static readonly STATUS_CACHE_TTL = 30_000;

  /**
   * Fetch table row counts from Eduskunta API
   */
  private async fetchApiTableCounts(): Promise<Record<string, number>> {
    if (AdminStorageService.cachedApiTableCounts) {
      return AdminStorageService.cachedApiTableCounts;
    }

    if (AdminStorageService.apiFetchInFlight) {
      return AdminStorageService.apiFetchInFlight;
    }

    AdminStorageService.apiFetchInFlight = (async () => {
      try {
        const resp = await fetch(
          "https://avoindata.eduskunta.fi/api/v1/tables/counts",
          { signal: AbortSignal.timeout(2_000) },
        );
        const data = (await resp.json()) as {
          tableName: string;
          rowCount: number;
        }[];
        const counts = Object.fromEntries(data.map((v) => [v.tableName, v.rowCount]));
        AdminStorageService.cachedApiTableCounts = counts;
        return counts;
      } catch (error) {
        console.error("Error fetching API table counts:", error);
        return AdminStorageService.cachedApiTableCounts ?? {};
      } finally {
        AdminStorageService.apiFetchInFlight = null;
      }
    })();

    return AdminStorageService.apiFetchInFlight;
  }

  getTableNames(): string[] {
    return (Object.values(TableName) as string[]).sort();
  }

  private async buildTableStatus(
    tableName: string,
    apiCounts: Record<string, number>,
    stageSnapshots: Record<string, SourceStageStatusSnapshot>,
  ): Promise<TableStorageStatus> {
    const rawSnapshot = stageSnapshots[this.buildStageSnapshotKey("raw", tableName)];
    const parsedSnapshot = stageSnapshots[
      this.buildStageSnapshotKey("parsed", tableName)
    ];

    const rawFiles = rawSnapshot ? [] : await this.getTableFiles("raw", tableName);
    const parsedFiles = parsedSnapshot
      ? []
      : await this.getTableFiles("parsed", tableName);

    const rawPageCount = rawSnapshot ? rawSnapshot.pageCount : rawFiles.length;
    const parsedPageCount = parsedSnapshot
      ? parsedSnapshot.pageCount
      : parsedFiles.length;

    const hasRaw = rawSnapshot ? rawSnapshot.pageCount > 0 : rawFiles.length > 0;
    const hasParsed = parsedSnapshot
      ? parsedSnapshot.pageCount > 0
      : parsedFiles.length > 0;

    const rawEstimatedRows = rawSnapshot
      ? this.estimateRowsFromSnapshot(rawSnapshot)
      : await this.getExactRowCount("raw", tableName, rawFiles);
    const parsedEstimatedRows = parsedSnapshot
      ? this.estimateRowsFromSnapshot(parsedSnapshot)
      : await this.getExactRowCount("parsed", tableName, parsedFiles);

    const rawLastUpdated = rawSnapshot
      ? rawSnapshot.lastUpdated
      : this.getMostRecentTimestamp(rawFiles);
    const parsedLastUpdated = parsedSnapshot
      ? parsedSnapshot.lastUpdated
      : this.getMostRecentTimestamp(parsedFiles);

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
      has_raw_data: hasRaw,
      has_parsed_data: hasParsed,
      raw_last_updated: rawLastUpdated,
      parsed_last_updated: parsedLastUpdated,
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
  private getMostRecentTimestamp(files: StorageMetadata[]): string | null {
    if (files.length === 0) return null;

    const mostRecent = files.reduce((latest, file) => {
      return file.lastModified > latest.lastModified ? file : latest;
    });

    return mostRecent.lastModified.toISOString();
  }

  /**
   * Get exact row count by reading only the last page file
   * Formula: (pageCount - 1) * 100 + lastPageRowCount
   */
  private async getExactRowCount(
    _stage: DataStage,
    _tableName: string,
    files: StorageMetadata[],
  ): Promise<number> {
    if (files.length === 0) return 0;
    if (files.length === 1) {
      // Just one page, read it to get exact count
      const storage = getStorage();
      try {
        const data = await storage.get(files[0].key);
        if (data) {
          const pageData = JSON.parse(data) as { rowCount: number };
          return pageData.rowCount || 0;
        }
      } catch (error) {
        console.error(`Error reading ${files[0].key}:`, error);
        return 100; // Fallback estimate
      }
    }

    const storage = getStorage();

    // Find the last page (highest page number)
    const sortedFiles = files
      .map((f) => ({ file: f, parsed: StorageKeyBuilder.parseKey(f.key) }))
      .filter((f) => f.parsed !== null)
      .sort((a, b) => (b.parsed?.page || 0) - (a.parsed?.page || 0));

    if (sortedFiles.length === 0) {
      // Fallback: estimate all pages as 100 rows
      return files.length * 100;
    }

    const lastFile = sortedFiles[0].file;

    try {
      const data = await storage.get(lastFile.key);
      if (data) {
        const pageData = JSON.parse(data) as { rowCount: number };
        const lastPageRows = pageData.rowCount || 0;
        // (pageCount - 1) * 100 + lastPageRows
        return (files.length - 1) * 100 + lastPageRows;
      }
    } catch (error) {
      console.error(`Error reading last page ${lastFile.key}:`, error);
    }

    // Fallback to estimation
    return files.length * 100;
  }

  private buildStageSnapshotKey(stage: DataStage, tableName: string): string {
    return `${stage}:${tableName}`;
  }

  private estimateRowsFromSnapshot(
    snapshot: SourceStageStatusSnapshot,
  ): number {
    if (snapshot.pageCount === 0) return 0;
    return (snapshot.pageCount - 1) * 100 + snapshot.lastPageRowCount;
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
      const apiCounts = await this.fetchApiTableCounts();
      const stageSnapshots = await loadSourceStageStatusMap();
      const data = await Promise.all(
        tables.map((tableName) =>
          this.buildTableStatus(tableName, apiCounts, stageSnapshots),
        ),
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

    const apiCounts = await this.fetchApiTableCounts();
    const stageSnapshots = await loadSourceStageStatusMap();
    return await this.buildTableStatus(tableName, apiCounts, stageSnapshots);
  }

  /**
   * Get list of available pages for a table
   */
  async getTablePages(tableName: string, stage: DataStage): Promise<number[]> {
    const files = await this.getTableFiles(stage, tableName);
    const pageNumbers: number[] = [];

    for (const file of files) {
      const parsed = StorageKeyBuilder.parseKey(file.key);
      if (parsed) {
        pageNumbers.push(parsed.page);
      }
    }

    return pageNumbers.sort((a, b) => a - b);
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

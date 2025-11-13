import { getStorage } from "../../shared/storage/factory";
import { StorageKeyBuilder, type DataStage, type StorageMetadata } from "../../shared/storage/types";
import { TableName } from "#constants/index";

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
}

export class AdminStorageService {
  /**
   * Get all files for a specific stage and table
   */
  private async getTableFiles(stage: DataStage, tableName: string): Promise<StorageMetadata[]> {
    const storage = getStorage();
    const prefix = StorageKeyBuilder.listPrefixForTable(stage, tableName);

    try {
      const result = await storage.list({ prefix });
      return result.keys;
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
   * Estimate row count based on page count
   * Assumes ~100 rows per page (standard batch size from API)
   */
  private estimateRowCount(pageCount: number): number {
    return pageCount * 100;
  }

  /**
   * Get status for all tables
   */
  async getStatus(): Promise<TableStorageStatus[]> {
    const tables = (Object.values(TableName) as string[]).sort();
    const status: TableStorageStatus[] = [];

    for (const tableName of tables) {
      // Get files for both stages
      const rawFiles = await this.getTableFiles("raw", tableName);
      const parsedFiles = await this.getTableFiles("parsed", tableName);

      const hasRaw = rawFiles.length > 0;
      const hasParsed = parsedFiles.length > 0;

      status.push({
        table_name: tableName,
        raw_page_count: rawFiles.length,
        parsed_page_count: parsedFiles.length,
        has_raw_data: hasRaw,
        has_parsed_data: hasParsed,
        raw_last_updated: this.getMostRecentTimestamp(rawFiles),
        parsed_last_updated: this.getMostRecentTimestamp(parsedFiles),
        raw_estimated_rows: this.estimateRowCount(rawFiles.length),
        parsed_estimated_rows: this.estimateRowCount(parsedFiles.length),
      });
    }

    return status;
  }

  /**
   * Get detailed status for a specific table
   */
  async getTableStatus(tableName: string): Promise<TableStorageStatus | null> {
    if (!Object.values(TableName).includes(tableName as any)) {
      return null;
    }

    const rawFiles = await this.getTableFiles("raw", tableName);
    const parsedFiles = await this.getTableFiles("parsed", tableName);

    const hasRaw = rawFiles.length > 0;
    const hasParsed = parsedFiles.length > 0;

    return {
      table_name: tableName,
      raw_page_count: rawFiles.length,
      parsed_page_count: parsedFiles.length,
      has_raw_data: hasRaw,
      has_parsed_data: hasParsed,
      raw_last_updated: this.getMostRecentTimestamp(rawFiles),
      parsed_last_updated: this.getMostRecentTimestamp(parsedFiles),
      raw_estimated_rows: this.estimateRowCount(rawFiles.length),
      parsed_estimated_rows: this.estimateRowCount(parsedFiles.length),
    };
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
}

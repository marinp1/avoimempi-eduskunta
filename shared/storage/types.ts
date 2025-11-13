/**
 * Storage abstraction types for offline-first, cloud-agnostic data storage
 */

export type StorageKey = string; // e.g., "raw/MemberOfParliament/page_1.json"

export interface StorageMetadata {
  key: StorageKey;
  size: number;
  lastModified: Date;
  etag?: string;
}

export interface StorageListOptions {
  prefix?: string;
  maxKeys?: number;
  startAfter?: string;
}

export interface StorageListResult {
  keys: StorageMetadata[];
  isTruncated: boolean;
  nextContinuationToken?: string;
}

export interface StoragePutOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

/**
 * Storage provider interface
 * Implementations: Local filesystem, S3, R2, MinIO, etc.
 */
export interface IStorageProvider {
  /**
   * Write data to storage
   */
  put(key: StorageKey, data: string | Buffer, options?: StoragePutOptions): Promise<void>;

  /**
   * Read data from storage
   */
  get(key: StorageKey): Promise<string | null>;

  /**
   * Check if key exists
   */
  exists(key: StorageKey): Promise<boolean>;

  /**
   * List keys with optional prefix filter
   */
  list(options?: StorageListOptions): Promise<StorageListResult>;

  /**
   * Delete a key
   */
  delete(key: StorageKey): Promise<void>;

  /**
   * Get metadata for a key
   */
  metadata(key: StorageKey): Promise<StorageMetadata | null>;

  /**
   * Get the provider name (for logging/debugging)
   */
  readonly name: string;
}

/**
 * Helper types for data pipeline
 */
export type DataStage = "raw" | "parsed";

export interface PageReference {
  table: string;
  page: number;
  stage: DataStage;
}

/**
 * Helper to construct storage keys
 */
export class StorageKeyBuilder {
  static forPage(stage: DataStage, tableName: string, pageNumber: number): StorageKey {
    return `${stage}/${tableName}/page_${pageNumber}.json`;
  }

  static parseKey(key: StorageKey): PageReference | null {
    const match = key.match(/^(raw|parsed)\/([^/]+)\/page_(\d+)\.json$/);
    if (!match) return null;

    return {
      stage: match[1] as DataStage,
      table: match[2],
      page: parseInt(match[3], 10),
    };
  }

  static listPrefixForTable(stage: DataStage, tableName: string): string {
    return `${stage}/${tableName}/`;
  }

  static listPrefixForStage(stage: DataStage): string {
    return `${stage}/`;
  }
}

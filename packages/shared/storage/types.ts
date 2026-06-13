/**
 * Storage abstraction types for offline-first, cloud-agnostic data storage
 */

export type StorageKey = string; // e.g., "artifacts/snapshots/avoimempi-eduskunta.db"

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
  put(
    key: StorageKey,
    data: string | Buffer,
    options?: StoragePutOptions,
  ): Promise<void>;

  /**
   * Upload/copy a local file to storage without loading entire file into memory.
   * Recommended for large artifacts (e.g. multi-GB SQLite snapshots).
   */
  putFile?(
    key: StorageKey,
    localFilePath: string,
    options?: StoragePutOptions,
  ): Promise<void>;

  /**
   * Download/copy a storage object to a local file path without buffering full content.
   * Recommended for large artifacts (e.g. multi-GB SQLite files).
   */
  getFile?(key: StorageKey, localFilePath: string): Promise<void>;

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

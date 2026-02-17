/**
 * Storage abstraction for offline-first, cloud-agnostic data storage
 *
 * Usage:
 *
 * ```typescript
 * import { getStorage, StorageKeyBuilder } from "#storage";
 *
 * const storage = getStorage();
 *
 * // Write data
 * const key = StorageKeyBuilder.forPage("raw", "MemberOfParliament", 1);
 * await storage.put(key, JSON.stringify(data));
 *
 * // Read data
 * const data = await storage.get(key);
 *
 * // List files
 * const prefix = StorageKeyBuilder.listPrefixForTable("raw", "MemberOfParliament");
 * const result = await storage.list({ prefix });
 * ```
 *
 * Configuration via environment variables:
 * - STORAGE_PROVIDER=local (default)
 * - STORAGE_LOCAL_DIR=./data (default)
 *
 * Future S3 support:
 * - STORAGE_PROVIDER=s3|r2|minio
 * - STORAGE_S3_REGION=us-east-1
 * - STORAGE_S3_BUCKET=my-bucket
 * - STORAGE_S3_ACCESS_KEY_ID=xxx
 * - STORAGE_S3_SECRET_ACCESS_KEY=xxx
 * - STORAGE_S3_ENDPOINT=https://xxx (for R2/MinIO)
 */

export * from "./config";
export * from "./factory";
export * from "./list-all";
export * from "./providers/local";
export * from "./types";

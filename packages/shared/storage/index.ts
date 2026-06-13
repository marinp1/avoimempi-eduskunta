/**
 * Storage abstraction for offline-first, cloud-agnostic data storage
 *
 * Usage:
 *
 * ```typescript
 * import { getStorage } from "#storage";
 *
 * const storage = getStorage();
 *
 * // Write data
 * const key = "artifacts/metadata/changes-report.json";
 * await storage.put(key, JSON.stringify(data));
 *
 * // Read data
 * const data = await storage.get(key);
 *
 * // List files
 * const result = await storage.list({ prefix: "artifacts/" });
 * ```
 *
 * Configuration via environment variables:
 * - STORAGE_PROVIDER=local (default)
 * - STORAGE_LOCAL_DIR=./data (default)
 */

export * from "./config";
export * from "./document-handler/index";
export * from "./factory";
export * from "./list-all";
export * from "./providers/local";
export * from "./row-store/index";
export * from "./types";

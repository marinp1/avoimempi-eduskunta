import type {
  IStorageProvider,
  StorageKey,
  StorageMetadata,
  StorageListOptions,
  StorageListResult,
  StoragePutOptions
} from "../types";
import { mkdir, readFile, writeFile, unlink, stat, readdir } from "fs/promises";
import { existsSync, statSync } from "fs";
import path from "path";

/**
 * Local filesystem storage provider
 * Stores data in a local directory with same structure as S3
 */
export class LocalStorageProvider implements IStorageProvider {
  readonly name = "local";
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = path.resolve(baseDir);
  }

  private keyToPath(key: StorageKey): string {
    return path.join(this.baseDir, key);
  }

  async put(key: StorageKey, data: string | Buffer, options?: StoragePutOptions): Promise<void> {
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(filePath, data, "utf-8");
  }

  async get(key: StorageKey): Promise<string | null> {
    const filePath = this.keyToPath(key);

    try {
      const data = await readFile(filePath, "utf-8");
      return data;
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async exists(key: StorageKey): Promise<boolean> {
    const filePath = this.keyToPath(key);
    return existsSync(filePath);
  }

  async list(options?: StorageListOptions): Promise<StorageListResult> {
    const prefix = options?.prefix || "";
    const maxKeys = options?.maxKeys || 1000;
    const startAfter = options?.startAfter || "";

    const searchDir = prefix
      ? path.join(this.baseDir, prefix.split("/").slice(0, -1).join("/"))
      : this.baseDir;

    const keys: StorageMetadata[] = [];

    try {
      await this.listRecursive(searchDir, this.baseDir, prefix, startAfter, maxKeys, keys);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      // Directory doesn't exist, return empty list
    }

    return {
      keys: keys.slice(0, maxKeys),
      isTruncated: keys.length > maxKeys,
      nextContinuationToken: keys.length > maxKeys ? keys[maxKeys].key : undefined,
    };
  }

  private async listRecursive(
    dir: string,
    baseDir: string,
    prefix: string,
    startAfter: string,
    maxKeys: number,
    results: StorageMetadata[]
  ): Promise<void> {
    if (results.length >= maxKeys) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (results.length >= maxKeys) break;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

        if (entry.isDirectory()) {
          await this.listRecursive(fullPath, baseDir, prefix, startAfter, maxKeys, results);
        } else if (entry.isFile()) {
          // Check if matches prefix and is after startAfter
          if (relativePath.startsWith(prefix) && relativePath > startAfter) {
            const stats = await stat(fullPath);
            results.push({
              key: relativePath,
              size: stats.size,
              lastModified: stats.mtime,
            });
          }
        }
      }
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  async delete(key: StorageKey): Promise<void> {
    const filePath = this.keyToPath(key);

    try {
      await unlink(filePath);
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      // File doesn't exist, consider it deleted
    }
  }

  async metadata(key: StorageKey): Promise<StorageMetadata | null> {
    const filePath = this.keyToPath(key);

    try {
      const stats = await stat(filePath);
      return {
        key,
        size: stats.size,
        lastModified: stats.mtime,
      };
    } catch (error: any) {
      if (error.code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }
}

import { existsSync } from "node:fs";
import {
  copyFile,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import type {
  IStorageProvider,
  StorageKey,
  StorageListOptions,
  StorageListResult,
  StorageMetadata,
  StoragePutOptions,
} from "../types";

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

  async put(
    key: StorageKey,
    data: string | Buffer,
    _options?: StoragePutOptions,
  ): Promise<void> {
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    await mkdir(dir, { recursive: true });

    // Write file
    await writeFile(filePath, data, "utf-8");
  }

  async putFile(
    key: StorageKey,
    localFilePath: string,
    _options?: StoragePutOptions,
  ): Promise<void> {
    const filePath = this.keyToPath(key);
    const dir = path.dirname(filePath);

    await mkdir(dir, { recursive: true });
    await copyFile(localFilePath, filePath);
  }

  async getFile(key: StorageKey, localFilePath: string): Promise<void> {
    const sourcePath = this.keyToPath(key);
    const dir = path.dirname(localFilePath);

    await mkdir(dir, { recursive: true });
    await copyFile(sourcePath, localFilePath);
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
    const detectionLimit = maxKeys + 1;

    const searchDir = prefix
      ? path.join(this.baseDir, prefix.split("/").slice(0, -1).join("/"))
      : this.baseDir;

    const keys: StorageMetadata[] = [];

    try {
      await this.listRecursive(
        searchDir,
        this.baseDir,
        prefix,
        startAfter,
        detectionLimit,
        keys,
      );
    } catch (error: any) {
      if (error.code !== "ENOENT") {
        throw error;
      }
      // Directory doesn't exist, return empty list
    }

    return {
      keys: keys.slice(0, maxKeys),
      isTruncated: keys.length > maxKeys,
      nextContinuationToken:
        keys.length > maxKeys ? keys[maxKeys - 1].key : undefined,
    };
  }

  private async listRecursive(
    dir: string,
    baseDir: string,
    prefix: string,
    startAfter: string,
    maxResults: number,
    results: StorageMetadata[],
  ): Promise<void> {
    if (results.length >= maxResults) return;

    try {
      const entries = await readdir(dir, { withFileTypes: true });
      entries.sort((a, b) => a.name.localeCompare(b.name));

      for (const entry of entries) {
        if (results.length >= maxResults) break;

        const fullPath = path.join(dir, entry.name);
        const relativePath = path
          .relative(baseDir, fullPath)
          .replace(/\\/g, "/");

        if (entry.isDirectory()) {
          await this.listRecursive(
            fullPath,
            baseDir,
            prefix,
            startAfter,
            maxResults,
            results,
          );
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

import { mkdirSync } from "node:fs";
import path from "node:path";
import { getStorageConfig } from "../config";
import { PostgresRowStore } from "./providers/postgres";
import { SqliteRowStore } from "./providers/sqlite";
import type { IRowStore } from "./types";

let rawStore: IRowStore | null = null;
let parsedStore: IRowStore | null = null;

function getRowStoreDir(): string {
  const envDir = process.env.ROW_STORE_DIR;
  if (envDir) return path.resolve(envDir);

  const config = getStorageConfig();
  if (config.local?.baseDir) return config.local.baseDir;

  return path.join(process.cwd(), "data");
}

export function getRawRowStore(): IRowStore {
  if (!rawStore) {
    if (process.env.ROW_STORE_PROVIDER === "postgres") {
      const url = process.env.ROW_STORE_DATABASE_URL;
      if (!url) throw new Error("ROW_STORE_DATABASE_URL is required when ROW_STORE_PROVIDER=postgres");
      rawStore = new PostgresRowStore(url, "raw");
    } else {
      const dir = getRowStoreDir();
      mkdirSync(dir, { recursive: true });
      rawStore = new SqliteRowStore(path.join(dir, "raw.db"), "raw");
    }
  }
  return rawStore;
}

export function getParsedRowStore(): IRowStore {
  if (!parsedStore) {
    if (process.env.ROW_STORE_PROVIDER === "postgres") {
      const url = process.env.ROW_STORE_DATABASE_URL;
      if (!url) throw new Error("ROW_STORE_DATABASE_URL is required when ROW_STORE_PROVIDER=postgres");
      parsedStore = new PostgresRowStore(url, "parsed");
    } else {
      const dir = getRowStoreDir();
      mkdirSync(dir, { recursive: true });
      parsedStore = new SqliteRowStore(path.join(dir, "parsed.db"), "parsed");
    }
  }
  return parsedStore;
}

/** Reset singleton instances (useful for testing). */
export function resetRowStores(): void {
  rawStore?.close();
  rawStore = null;
  parsedStore?.close();
  parsedStore = null;
}

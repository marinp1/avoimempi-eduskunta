import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageFactory, getStorage, StorageKeyBuilder } from "#storage";
import { getLastScrapedPageRef } from "../scraper/scraper";

async function withTempStorage(fn: () => Promise<void>) {
  const originalCwd = process.cwd();
  const originalStorageProvider = process.env.STORAGE_PROVIDER;
  const originalStorageLocalDir = process.env.STORAGE_LOCAL_DIR;
  const workspace = await mkdtemp(path.join(tmpdir(), "scraper-resume-"));

  try {
    process.chdir(workspace);
    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_DIR = path.join(workspace, "data");
    StorageFactory.reset();
    await fn();
  } finally {
    process.chdir(originalCwd);
    StorageFactory.reset();

    if (originalStorageProvider === undefined) {
      delete process.env.STORAGE_PROVIDER;
    } else {
      process.env.STORAGE_PROVIDER = originalStorageProvider;
    }

    if (originalStorageLocalDir === undefined) {
      delete process.env.STORAGE_LOCAL_DIR;
    } else {
      process.env.STORAGE_LOCAL_DIR = originalStorageLocalDir;
    }

    await rm(workspace, { recursive: true, force: true });
  }
}

describe("scraper auto-resume page selection", () => {
  test("selects latest page by highest firstPk when lastPk is identical", async () => {
    await withTempStorage(async () => {
      const storage = getStorage();
      const tableName = "TestTable";

      // Simulate API behavior where pkLastValue is the same global max across pages.
      await storage.put(
        StorageKeyBuilder.forPkRange("raw", tableName, 102, 999999),
        "{}",
      );
      await storage.put(
        StorageKeyBuilder.forPkRange("raw", tableName, 302, 999999),
        "{}",
      );
      await storage.put(
        StorageKeyBuilder.forPkRange("raw", tableName, 502, 999999),
        "{}",
      );

      const last = await getLastScrapedPageRef(storage, tableName, "raw");

      expect(last).not.toBeNull();
      expect(last?.firstPk).toBe(502);
      expect(last?.lastPk).toBe(999999);
    });
  });
});

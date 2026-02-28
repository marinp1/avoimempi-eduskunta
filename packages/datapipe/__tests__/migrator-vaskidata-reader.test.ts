import { describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { StorageFactory } from "#storage";
import { resetRowStores } from "#storage/row-store/factory";
import { SqliteRowStore } from "#storage/row-store/providers/sqlite";
import {
  listIndexedDocumentTypes,
  readVaskiIndex,
} from "../migrator/VaskiData/reader";

async function withTempWorkspace(fn: (workspace: string) => Promise<void>) {
  const originalCwd = process.cwd();
  const originalStorageProvider = process.env.STORAGE_PROVIDER;
  const originalStorageLocalDir = process.env.STORAGE_LOCAL_DIR;

  const workspace = await mkdtemp(path.join(tmpdir(), "vaski-reader-"));

  try {
    process.chdir(workspace);
    process.env.STORAGE_PROVIDER = "local";
    process.env.STORAGE_LOCAL_DIR = path.join(workspace, "data");
    StorageFactory.reset();
    resetRowStores();
    await fn(workspace);
  } finally {
    process.chdir(originalCwd);
    StorageFactory.reset();
    resetRowStores();

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

describe("VaskiData reader", () => {
  test("builds index and document types from parsed row store when index file is missing", async () => {
    await withTempWorkspace(async (workspace) => {
      const dataDir = path.join(workspace, "data");
      await mkdir(dataDir, { recursive: true });

      const parsedStore = new SqliteRowStore(
        path.join(dataDir, "parsed.db"),
        "parsed",
      );
      await parsedStore.upsertBatch("VaskiData", "Id", [], [
        {
          pk: 1,
          data: JSON.stringify({
            id: "1",
            "#avoimempieduskunta": { documentType: "hallituksen_esitys" },
          }),
        },
        {
          pk: 2,
          data: JSON.stringify({
            id: "2",
            "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
          }),
        },
        {
          pk: 3,
          data: JSON.stringify({
            id: "3",
            _skip: true,
            "#avoimempieduskunta": { documentType: "nimenhuutoraportti" },
          }),
        },
      ]);
      parsedStore.close();

      const documentTypes = await listIndexedDocumentTypes();
      expect(documentTypes).toEqual([
        "hallituksen_esitys",
        "nimenhuutoraportti",
      ]);

      const index = await readVaskiIndex();
      expect(index).toEqual({
        hallituksen_esitys: { totalRecords: 1 },
        nimenhuutoraportti: { totalRecords: 1 },
      });
    });
  });
});

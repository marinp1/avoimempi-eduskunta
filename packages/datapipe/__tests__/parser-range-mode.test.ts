import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  getParsedRowStore,
  getRawRowStore,
  resetRowStores,
} from "#storage/row-store/factory";
import { parseTable } from "../parser/parser";

async function withTempRowStore(fn: () => Promise<void>) {
  const originalRowStoreDir = process.env.ROW_STORE_DIR;
  const dir = await mkdtemp(path.join(tmpdir(), "parser-range-"));

  try {
    process.env.ROW_STORE_DIR = dir;
    resetRowStores();
    await fn();
  } finally {
    resetRowStores();
    if (originalRowStoreDir === undefined) {
      delete process.env.ROW_STORE_DIR;
    } else {
      process.env.ROW_STORE_DIR = originalRowStoreDir;
    }
    await rm(dir, { recursive: true, force: true });
  }
}

const seedRawRows = async () => {
  const rawStore = getRawRowStore();
  await rawStore.upsertBatch(
    "TestTable",
    "Id",
    ["Id", "Name"],
    Array.from({ length: 10 }, (_, index) => {
      const id = index + 1;
      return {
        pk: id,
        data: JSON.stringify([id, `name-${id}`]),
      };
    }),
  );
};

describe("parser range mode", () => {
  test("supports single-PK and bounded PK-range parsing", async () => {
    await withTempRowStore(async () => {
      await seedRawRows();
      const parsedStore = getParsedRowStore();

      await parseTable({
        tableName: "TestTable",
        pkStartValue: 5,
        pkEndValue: 5,
      });

      expect(await parsedStore.count("TestTable")).toBe(1);
      expect((await parsedStore.get("TestTable", 5))?.pk).toBe(5);
      expect(await parsedStore.get("TestTable", 4)).toBeNull();

      await parseTable({
        tableName: "TestTable",
        pkStartValue: 3,
        pkEndValue: 6,
      });

      expect(await parsedStore.count("TestTable")).toBe(4);
      expect((await parsedStore.get("TestTable", 3))?.pk).toBe(3);
      expect((await parsedStore.get("TestTable", 4))?.pk).toBe(4);
      expect((await parsedStore.get("TestTable", 6))?.pk).toBe(6);

      await parseTable({
        tableName: "TestTable",
        pkStartValue: 50,
        pkEndValue: 50,
      });

      expect(await parsedStore.count("TestTable")).toBe(4);
    });
  });

  test("supports start-only range parsing", async () => {
    await withTempRowStore(async () => {
      await seedRawRows();
      const parsedStore = getParsedRowStore();

      await parseTable({
        tableName: "TestTable",
        pkStartValue: 8,
      });

      expect(await parsedStore.count("TestTable")).toBe(3);
      expect((await parsedStore.get("TestTable", 8))?.pk).toBe(8);
      expect((await parsedStore.get("TestTable", 9))?.pk).toBe(9);
      expect((await parsedStore.get("TestTable", 10))?.pk).toBe(10);
      expect(await parsedStore.get("TestTable", 7)).toBeNull();
    });
  });
});

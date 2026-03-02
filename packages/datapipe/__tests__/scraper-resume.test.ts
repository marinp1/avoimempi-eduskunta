import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { SqliteRowStore } from "../../shared/storage/row-store/providers/sqlite";

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(tmpdir(), "scraper-resume-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

describe("scraper auto-resume via maxPk", () => {
  test("maxPk returns the highest pk stored for a table", async () => {
    await withTempDir(async (dir) => {
      const store = new SqliteRowStore(path.join(dir, "raw.db"), "raw");

      await store.upsertBatch(
        "TestTable",
        "id",
        ["id", "name"],
        [
          { pk: 102, data: JSON.stringify([102, "a"]) },
          { pk: 302, data: JSON.stringify([302, "b"]) },
          { pk: 502, data: JSON.stringify([502, "c"]) },
        ],
      );

      const max = await store.maxPk("TestTable");
      expect(max).toBe(502);

      // auto-resume pkStartValue = maxPk + 1
      const pkStartValue = (max ?? -1) + 1;
      expect(pkStartValue).toBe(503);

      store.close();
    });
  });

  test("maxPk returns null for an empty table", async () => {
    await withTempDir(async (dir) => {
      const store = new SqliteRowStore(path.join(dir, "raw2.db"), "raw");

      const max = await store.maxPk("EmptyTable");
      expect(max).toBeNull();

      // auto-resume pkStartValue = 0 (start fresh)
      const pkStartValue = (max ?? -1) + 1;
      expect(pkStartValue).toBe(0);

      store.close();
    });
  });

  test("upsert is idempotent — re-inserting same pk updates data", async () => {
    await withTempDir(async (dir) => {
      const store = new SqliteRowStore(path.join(dir, "raw3.db"), "raw");

      await store.upsertBatch(
        "TestTable",
        "id",
        ["id", "name"],
        [{ pk: 1, data: JSON.stringify([1, "original"]) }],
      );

      await store.upsertBatch(
        "TestTable",
        "id",
        ["id", "name"],
        [{ pk: 1, data: JSON.stringify([1, "updated"]) }],
      );

      const row = await store.get("TestTable", 1);
      expect(row).not.toBeNull();
      expect(JSON.parse(row!.data)).toEqual([1, "updated"]);

      const count = await store.count("TestTable");
      expect(count).toBe(1);

      store.close();
    });
  });
});

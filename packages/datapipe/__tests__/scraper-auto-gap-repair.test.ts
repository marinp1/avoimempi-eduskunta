import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { getRawRowStore, resetRowStores } from "#storage/row-store/factory";
import { scrapeTable } from "../scraper/scraper";

async function withTempRowStore(fn: () => Promise<void>) {
  const originalRowStoreDir = process.env.ROW_STORE_DIR;
  const dir = await mkdtemp(path.join(tmpdir(), "scraper-gap-repair-"));

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

describe("scraper auto gap repair", () => {
  test("auto-resume repairs internal PK gaps when API count is higher", async () => {
    await withTempRowStore(async () => {
      const rawStore = getRawRowStore();
      await rawStore.upsertBatch(
        "TestTable",
        "Id",
        ["Id", "Name"],
        [
          { pk: 1, data: JSON.stringify([1, "name-1"]) },
          { pk: 2, data: JSON.stringify([2, "name-2"]) },
          { pk: 4, data: JSON.stringify([4, "name-4"]) },
          { pk: 5, data: JSON.stringify([5, "name-5"]) },
        ],
      );

      const apiRows: Array<[number, string]> = [
        [1, "name-1"],
        [2, "name-2"],
        [3, "name-3"],
        [4, "name-4"],
        [5, "name-5"],
      ];
      const batchStarts: number[] = [];
      const originalFetch = globalThis.fetch;

      globalThis.fetch = (async (input: RequestInfo | URL) => {
        const url = new URL(String(input));

        if (url.pathname.endsWith("/columns")) {
          return new Response(
            JSON.stringify({
              pkName: "Id",
              columnNames: ["Id", "Name"],
            }),
            { status: 200 },
          );
        }

        if (url.pathname.endsWith("/rows")) {
          const page = Number.parseInt(url.searchParams.get("page") ?? "0", 10);
          const pageSize = Number.parseInt(
            url.searchParams.get("pageSize") ?? "100",
            10,
          );
          const start = page * pageSize;
          const pageRows = apiRows.slice(start, start + pageSize);

          return new Response(
            JSON.stringify({
              rowCount: pageRows.length,
              hasMore: start + pageRows.length < apiRows.length,
            }),
            { status: 200 },
          );
        }

        if (url.pathname.endsWith("/batch")) {
          const pkStartValue = Number.parseInt(
            url.searchParams.get("pkStartValue") ?? "0",
            10,
          );
          const perPage = Number.parseInt(
            url.searchParams.get("perPage") ?? "100",
            10,
          );
          batchStarts.push(pkStartValue);

          const filtered = apiRows.filter((row) => row[0] >= pkStartValue);
          const pageRows = filtered.slice(0, perPage);

          return new Response(
            JSON.stringify({
              columnNames: ["Id", "Name"],
              pkName: "Id",
              pkLastValue:
                pageRows.length > 0 ? pageRows[pageRows.length - 1][0] : null,
              rowData: pageRows,
              rowCount: pageRows.length,
              hasMore: filtered.length > perPage,
            }),
            { status: 200 },
          );
        }

        return new Response("not found", { status: 404 });
      }) as typeof fetch;

      try {
        await scrapeTable({
          tableName: "TestTable",
          mode: { type: "auto-resume" },
        });
      } finally {
        globalThis.fetch = originalFetch;
      }

      expect((await rawStore.get("TestTable", 3))?.pk).toBe(3);
      expect(await rawStore.count("TestTable")).toBe(5);
      expect(batchStarts).toEqual([6, 3]);
    });
  });
});

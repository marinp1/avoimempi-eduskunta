import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { resetRowStores, getRawRowStore } from "#storage/row-store/factory";
import { scrapeTable } from "../scraper/scraper";

async function withTempRowStore(fn: (dir: string) => Promise<void>) {
  const originalRowStoreDir = process.env.ROW_STORE_DIR;
  const dir = await mkdtemp(path.join(tmpdir(), "scraper-range-"));

  try {
    process.env.ROW_STORE_DIR = dir;
    resetRowStores();
    await fn(dir);
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

describe("scraper range mode", () => {
  test("supports exact single-PK refresh and bounded range scraping", async () => {
    await withTempRowStore(async () => {
      const originalFetch = globalThis.fetch;
      const rows: Array<[number, string]> = Array.from({ length: 10 }, (_, i) => [
        i + 1,
        `name-${i + 1}`,
      ]);

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
          const pageRows = rows.slice(start, start + pageSize);
          return new Response(
            JSON.stringify({
              rowCount: pageRows.length,
              hasMore: start + pageRows.length < rows.length,
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
          const filtered = rows.filter((row) => row[0] >= pkStartValue);
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
          mode: { type: "range", pkStartValue: 5, pkEndValue: 5 },
        });

        const rawStore = getRawRowStore();
        expect(await rawStore.count("TestTable")).toBe(1);
        expect((await rawStore.get("TestTable", 5))?.pk).toBe(5);
        expect(await rawStore.get("TestTable", 6)).toBeNull();

        await scrapeTable({
          tableName: "TestTable",
          mode: { type: "range", pkStartValue: 3, pkEndValue: 6 },
        });

        expect(await rawStore.count("TestTable")).toBe(4);
        expect((await rawStore.get("TestTable", 3))?.pk).toBe(3);
        expect((await rawStore.get("TestTable", 4))?.pk).toBe(4);
        expect((await rawStore.get("TestTable", 6))?.pk).toBe(6);

        await scrapeTable({
          tableName: "TestTable",
          mode: { type: "range", pkStartValue: 50, pkEndValue: 50 },
        });

        expect(await rawStore.count("TestTable")).toBe(4);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });
});

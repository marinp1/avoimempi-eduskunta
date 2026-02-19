import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { TableNames } from "#constants";
import {
  getExactTableCountByRows,
  getExactTableCountMapByRows,
  getExactTableCountsByRows,
} from "#table-counts";

type FetchMock = typeof fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
    },
  });
}

describe("table-counts", () => {
  const originalFetch = globalThis.fetch;
  const originalConsoleLog = console.log;
  const originalConsoleWarn = console.warn;

  beforeEach(() => {
    console.log = () => {};
    console.warn = () => {};
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    console.log = originalConsoleLog;
    console.warn = originalConsoleWarn;
  });

  test("returns 0 when the first page is empty", async () => {
    globalThis.fetch = (async () => {
      return jsonResponse({
        rowCount: 0,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const count = await getExactTableCountByRows("MemberOfParliament");
    expect(count).toBe(0);
  });

  test("returns first page row count when hasMore is false", async () => {
    globalThis.fetch = (async () => {
      return jsonResponse({
        rowCount: 42,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const count = await getExactTableCountByRows("MemberOfParliament");
    expect(count).toBe(42);
  });

  test("resolves exact count for multi-page data with 0-based formula", async () => {
    const requestedPages: number[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") || "0");
      requestedPages.push(page);

      if (page < 5) {
        return jsonResponse({ rowCount: 100, hasMore: true });
      }
      if (page === 5) {
        return jsonResponse({ rowCount: 17, hasMore: false });
      }

      return jsonResponse({ rowCount: 0, hasMore: false });
    }) as unknown as FetchMock;

    const count = await getExactTableCountByRows("MemberOfParliament");
    expect(count).toBe(517);
    expect(new Set(requestedPages).has(5)).toBe(true);
  });

  test("uses candidate row count as a probe hint", async () => {
    const requestedPages: number[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") || "0");
      requestedPages.push(page);

      if (page < 5) {
        return jsonResponse({ rowCount: 100, hasMore: true });
      }
      if (page === 5) {
        return jsonResponse({ rowCount: 44, hasMore: false });
      }

      return jsonResponse({ rowCount: 0, hasMore: false });
    }) as unknown as FetchMock;

    const count = await getExactTableCountByRows("MemberOfParliament", {
      tableName: "MemberOfParliament",
      candidateRowCount: 540,
    });

    expect(count).toBe(544);
    expect(new Set(requestedPages).has(5)).toBe(true);
  });

  test("throws when max request cap is exceeded", async () => {
    globalThis.fetch = (async () => {
      return jsonResponse({ rowCount: 100, hasMore: true });
    }) as unknown as FetchMock;

    await expect(
      getExactTableCountByRows("MemberOfParliament", { maxRequests: 3 }),
    ).rejects.toThrow("Request limit exceeded");
  });

  test("returns /tables/counts-compatible shape for all tables", async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") || "0");
      const tableMatch = url.pathname.match(/\/tables\/([^/]+)\/rows$/);
      const tableName = tableMatch ? decodeURIComponent(tableMatch[1]) : "";

      if (page !== 0) {
        return jsonResponse({ rowCount: 0, hasMore: false });
      }

      return jsonResponse({
        rowCount: tableName.length,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const rows = await getExactTableCountsByRows();
    expect(rows).toHaveLength(TableNames.length);
    expect(rows[0]).toEqual({
      tableName: TableNames[0],
      rowCount: TableNames[0].length,
    });
    expect(rows[rows.length - 1]).toEqual({
      tableName: TableNames[rows.length - 1],
      rowCount: TableNames[rows.length - 1].length,
    });
  });

  test("returns only requested table when tableName is provided", async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const tableMatch = url.pathname.match(/\/tables\/([^/]+)\/rows$/);
      const tableName = tableMatch ? decodeURIComponent(tableMatch[1]) : "";
      return jsonResponse({
        rowCount: tableName.length,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const rows = await getExactTableCountsByRows({
      tableName: "MemberOfParliament",
    });

    expect(rows).toEqual([
      {
        tableName: "MemberOfParliament",
        rowCount: "MemberOfParliament".length,
      },
    ]);
  });

  test("returns map output for all tables", async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const page = Number(url.searchParams.get("page") || "0");
      if (page !== 0) {
        return jsonResponse({ rowCount: 0, hasMore: false });
      }
      return jsonResponse({ rowCount: 7, hasMore: false });
    }) as unknown as FetchMock;

    const counts = await getExactTableCountMapByRows();
    expect(Object.keys(counts)).toHaveLength(TableNames.length);
    expect(counts.MemberOfParliament).toBe(7);
    expect(counts.VaskiData).toBe(7);
  });

  test("returns map output for selected tableNames subset", async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const tableMatch = url.pathname.match(/\/tables\/([^/]+)\/rows$/);
      const tableName = tableMatch ? decodeURIComponent(tableMatch[1]) : "";

      if (tableName === "MemberOfParliament") {
        return jsonResponse({ rowCount: 5, hasMore: false });
      }

      if (tableName === "VaskiData") {
        return jsonResponse({ rowCount: 9, hasMore: false });
      }

      return jsonResponse({ rowCount: 0, hasMore: false });
    }) as unknown as FetchMock;

    const counts = await getExactTableCountMapByRows({
      tableNames: ["MemberOfParliament", "VaskiData"],
    });

    expect(Object.keys(counts)).toEqual(["MemberOfParliament", "VaskiData"]);
    expect(counts.MemberOfParliament).toBe(5);
    expect(counts.VaskiData).toBe(9);
  });

  test("throws when unknown table is requested", async () => {
    await expect(
      getExactTableCountsByRows({
        tableName: "NotATable",
      }),
    ).rejects.toThrow("Unknown table name");
  });

  test("falls back to candidate counts when API calls fail", async () => {
    globalThis.fetch = (async () => {
      return jsonResponse({ message: "error" }, 500);
    }) as unknown as FetchMock;

    const counts = await getExactTableCountMapByRows({
      tableNames: ["MemberOfParliament", "VaskiData"],
      candidateRowCounts: {
        MemberOfParliament: 111,
        VaskiData: 222,
      },
      fallbackToCandidateOnError: true,
    });

    expect(counts.MemberOfParliament).toBe(111);
    expect(counts.VaskiData).toBe(222);
  });

  test("skips failed tables when skipOnError is true", async () => {
    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      const tableMatch = url.pathname.match(/\/tables\/([^/]+)\/rows$/);
      const tableName = tableMatch ? decodeURIComponent(tableMatch[1]) : "";

      if (tableName === "VaskiData") {
        return jsonResponse({ message: "error" }, 500);
      }

      return jsonResponse({
        rowCount: 8,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const counts = await getExactTableCountMapByRows({
      tableNames: ["MemberOfParliament", "VaskiData"],
      skipOnError: true,
    });

    expect(counts.MemberOfParliament).toBe(8);
    expect("VaskiData" in counts).toBe(false);
  });

  test("calls the rows endpoint with correct query params", async () => {
    const requestedUrls: URL[] = [];

    globalThis.fetch = (async (input) => {
      const url = new URL(String(input));
      requestedUrls.push(url);

      return jsonResponse({
        rowCount: 25,
        hasMore: false,
      });
    }) as unknown as FetchMock;

    const rowCount = await getExactTableCountByRows("MemberOfParliament", {
      pageSize: 250,
    });

    expect(rowCount).toBe(25);
    expect(requestedUrls).toHaveLength(1);
    expect(requestedUrls[0].pathname).toBe(
      "/api/v1/tables/MemberOfParliament/rows",
    );
    expect(requestedUrls[0].searchParams.get("page")).toBe("0");
    expect(requestedUrls[0].searchParams.get("pageSize")).toBe("250");
  });
});

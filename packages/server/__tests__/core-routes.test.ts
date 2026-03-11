import { describe, expect, test } from "bun:test";
import { createCoreRoutes } from "../routes/core-routes";

const coreRoutes = createCoreRoutes({
  fetchImportSourceTableSummaries: () => ({ tables: [] }),
  fetchRowTrace: () => null,
  fetchParliamentComposition: () => [],
  fetchHallituskaudet: () => [],
  fetchLastMigrationTimestamp: () => null,
  fetchVersionInfo: () => ({ version: "test", gitHash: null }),
  checkReadiness: () => ({ ok: true }),
});

describe("core routes", () => {
  test("changes-report rejects non-numeric run ids", async () => {
    const response = await coreRoutes["/api/changes-report"].GET(
      new Request("https://example.test/api/changes-report?run=../../../tmp/x"),
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      message: "Invalid run id",
    });
  });
});

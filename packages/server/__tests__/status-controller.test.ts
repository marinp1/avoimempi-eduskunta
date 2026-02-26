import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { StatusController } from "../controllers/status-controller";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

let db: Database;
let controller: StatusController;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
  controller = new StatusController(db);
});

afterAll(() => {
  db.close();
});

describe("StatusController", () => {
  test("getOverview returns dynamic table stats", async () => {
    const overview = await controller.getOverview();
    const tableNames = overview.tables.map((t) => t.tableName);

    expect(overview.totalTables).toBeGreaterThan(0);
    expect(tableNames).toContain("Representative");
    expect(tableNames).toContain("Speech");
    expect(tableNames).toContain("VaskiDocument");
    expect(tableNames).toContain("RollCallReport");
  });

  test("getTableDetails rejects invalid table name", async () => {
    expect(controller.getTableDetails("NotATable")).rejects.toThrow(
      "Invalid table name",
    );
  });
});

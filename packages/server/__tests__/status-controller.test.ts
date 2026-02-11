import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { StatusController } from "../controllers/status-controller";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

let db: Database;
let controller: StatusController;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
  controller = new StatusController({ db } as any);
});

afterAll(() => {
  db.close();
});

describe("StatusController", () => {
  test("getOverview returns table stats without legacy table query errors", async () => {
    const overview = await controller.getOverview();
    const tableNames = overview.tables.map((t) => t.tableName);

    expect(overview.totalTables).toBeGreaterThan(0);
    expect(tableNames).toContain("DocumentSubject");
    expect(tableNames).toContain("DocumentRelation");
    expect(tableNames).not.toContain("VaskiSubject");
    expect(tableNames).not.toContain("VaskiRelationship");
  });

  test("getTableDetails rejects invalid table name", async () => {
    expect(controller.getTableDetails("VaskiSubject")).rejects.toThrow(
      "Invalid table name",
    );
  });
});

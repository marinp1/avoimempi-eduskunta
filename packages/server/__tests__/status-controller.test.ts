import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";
import { StatusController } from "../controllers/status-controller";

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
    expect(tableNames).toContain("VaskiSubject");
    expect(tableNames).toContain("VaskiRelationship");
    expect(tableNames).not.toContain("DocumentSubject");
    expect(tableNames).not.toContain("DocumentRelationship");
  });

  test("getTableDetails rejects invalid table name", async () => {
    expect(controller.getTableDetails("DocumentSubject")).rejects.toThrow(
      "Invalid table name",
    );
  });
});

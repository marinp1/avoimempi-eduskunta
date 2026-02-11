import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  getStatusTableCountQuery,
  getStatusTableInfoQuery,
  isStatusTableName,
  STATUS_TABLES,
} from "../database/status-queries";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("status query helpers", () => {
  test("all status table names exist in schema and count query executes", () => {
    for (const tableName of STATUS_TABLES) {
      const stmt = db.prepare<{ count: number }, []>(
        getStatusTableCountQuery(tableName),
      );
      const row = stmt.get();
      stmt.finalize();

      expect(typeof row?.count).toBe("number");
    }
  });

  test("table info query executes for each status table", () => {
    for (const tableName of STATUS_TABLES) {
      const stmt = db.prepare<{ name: string; type: string }, []>(
        getStatusTableInfoQuery(tableName),
      );
      const columns = stmt.all();
      stmt.finalize();

      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toHaveProperty("name");
    }
  });

  test("type guard validates known and unknown table names", () => {
    expect(isStatusTableName("DocumentSubject")).toBe(true);
    expect(isStatusTableName("VaskiSubject")).toBe(false);
    expect(isStatusTableName("NotATable")).toBe(false);
  });
});

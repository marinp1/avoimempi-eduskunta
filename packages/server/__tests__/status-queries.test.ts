import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  getStatusTableCountQuery,
  getStatusTableInfoQuery,
  getStatusTableNamesQuery,
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
  test("table name query returns user tables", () => {
    const stmt = db.prepare<{ name: string }, []>(getStatusTableNamesQuery());
    const rows = stmt.all();
    stmt.finalize();

    const tableNames = rows.map((row) => row.name);
    expect(tableNames).toContain("Representative");
    expect(tableNames).toContain("VaskiDocument");
    expect(tableNames).not.toContain("_bun_migrations");
    expect(tableNames).not.toContain("_migration_info");
  });

  test("count query executes for all discovered status tables", () => {
    const tableNames = db
      .prepare<{ name: string }, []>(getStatusTableNamesQuery())
      .all()
      .map((row) => row.name);

    for (const tableName of tableNames) {
      const stmt = db.prepare<{ count: number }, []>(
        getStatusTableCountQuery(tableName),
      );
      const row = stmt.get();
      stmt.finalize();

      expect(typeof row?.count).toBe("number");
    }
  });

  test("table info query executes for all discovered status tables", () => {
    const tableNames = db
      .prepare<{ name: string }, []>(getStatusTableNamesQuery())
      .all()
      .map((row) => row.name);

    for (const tableName of tableNames) {
      const stmt = db.prepare<{ name: string; type: string }, []>(
        getStatusTableInfoQuery(tableName),
      );
      const columns = stmt.all();
      stmt.finalize();

      expect(columns.length).toBeGreaterThan(0);
      expect(columns[0]).toHaveProperty("name");
    }
  });

  test("identifier escaping protects generated table queries", () => {
    expect(getStatusTableCountQuery('A"B')).toContain('"A""B"');
    expect(getStatusTableInfoQuery('A"B')).toContain('"A""B"');
  });
});

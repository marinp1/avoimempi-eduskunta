import { describe, test, expect } from "bun:test";
import {
  MIGRATOR_SQL,
  SQLITE_PRAGMAS,
  getDeleteAllRowsQuery,
} from "../database/sql-statements";

describe("SQL statements centralization", () => {
  test("migrator SQL statements are non-empty", () => {
    for (const sql of Object.values(MIGRATOR_SQL)) {
      expect(sql.length).toBeGreaterThan(0);
    }
  });

  test("sqlite pragma statements are non-empty", () => {
    for (const sql of Object.values(SQLITE_PRAGMAS)) {
      expect(sql.length).toBeGreaterThan(0);
    }
  });

  test("delete-all query escapes identifiers", () => {
    const sql = getDeleteAllRowsQuery('weird"table');
    expect(sql).toBe('DELETE FROM "weird""table";');
  });
});

import { describe, test, expect, beforeEach, afterEach } from "bun:test";
import { Database } from "bun:sqlite";
import {
  parseDate,
  parseDateTime,
  parseYear,
  insertRows,
  createBatchingInserter,
  clearStatementCache,
} from "../migrator/utils";

describe("parseDate", () => {
  test("returns null for null input", () => {
    expect(parseDate(null)).toBeNull();
  });

  test("returns null for undefined input", () => {
    expect(parseDate(undefined)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseDate("")).toBeNull();
  });

  test("extracts date from ISO datetime string", () => {
    expect(parseDate("2024-01-15T10:30:00.000Z")).toBe("2024-01-15");
  });

  test("extracts date from date-only string", () => {
    expect(parseDate("2024-12-31")).toBe("2024-12-31");
  });
});

describe("parseDateTime", () => {
  test("returns null for null input", () => {
    expect(parseDateTime(null)).toBeNull();
  });

  test("returns null for undefined input", () => {
    expect(parseDateTime(undefined)).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseDateTime("")).toBeNull();
  });

  test("formats ISO datetime correctly", () => {
    expect(parseDateTime("2024-01-15T10:30:45.000Z")).toBe(
      "2024-01-15T10:30:45.000Z",
    );
  });

  test("handles datetime without timezone", () => {
    expect(parseDateTime("2024-01-15 10:30:45")).toBe("2024-01-15T10:30:45");
  });
});

describe("parseYear", () => {
  test("parses valid year string", () => {
    expect(parseYear("2024")).toBe(2024);
  });

  test("parses year with leading zeros", () => {
    expect(parseYear("0999")).toBe(999);
  });

  test("returns null for non-numeric string", () => {
    expect(parseYear("abc")).toBeNull();
  });

  test("returns null for empty string", () => {
    expect(parseYear("")).toBeNull();
  });
});

describe("insertRows", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(
      "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)",
    );
    clearStatementCache();
  });

  afterEach(() => {
    db.close();
  });

  test("inserts a single row", () => {
    insertRows(db)("test_table", [{ id: 1, name: "foo", value: 42 }]);

    const rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual({ id: 1, name: "foo", value: 42 });
  });

  test("inserts multiple rows", () => {
    insertRows(db)("test_table", [
      { id: 1, name: "a", value: 10 },
      { id: 2, name: "b", value: 20 },
      { id: 3, name: "c", value: 30 },
    ]);

    const rows = db.query("SELECT * FROM test_table ORDER BY id").all();
    expect(rows).toHaveLength(3);
    expect((rows[2] as any).name).toBe("c");
  });

  test("handles empty array without error", () => {
    insertRows(db)("test_table", []);
    const rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(0);
  });

  test("handles null values", () => {
    insertRows(db)("test_table", [{ id: 1, name: null, value: null }]);

    const rows = db.query("SELECT * FROM test_table").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBeNull();
    expect(rows[0].value).toBeNull();
  });

  test("handles zero values correctly (not as null)", () => {
    insertRows(db)("test_table", [{ id: 1, name: "zero", value: 0 }]);

    const rows = db.query("SELECT * FROM test_table").all() as any[];
    expect(rows[0].value).toBe(0);
  });

  test("ignores duplicate primary keys (INSERT OR IGNORE)", () => {
    insertRows(db)("test_table", [
      { id: 1, name: "first", value: 10 },
      { id: 1, name: "duplicate", value: 20 },
    ]);

    const rows = db.query("SELECT * FROM test_table").all() as any[];
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("first");
  });
});

describe("createBatchingInserter", () => {
  let db: Database;

  beforeEach(() => {
    db = new Database(":memory:");
    db.exec(
      "CREATE TABLE test_table (id INTEGER PRIMARY KEY, name TEXT, value INTEGER)",
    );
    clearStatementCache();
  });

  afterEach(() => {
    db.close();
  });

  test("accumulates rows and flushes manually", () => {
    const batcher = createBatchingInserter(db, 100);

    batcher.insertRows("test_table", [{ id: 1, name: "a", value: 10 }]);
    batcher.insertRows("test_table", [{ id: 2, name: "b", value: 20 }]);

    // Not yet flushed
    let rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(0);

    // Flush
    batcher.flushAll();
    rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(2);
  });

  test("auto-flushes when batch size is reached", () => {
    const batcher = createBatchingInserter(db, 3);

    batcher.insertRows("test_table", [{ id: 1, name: "a", value: 10 }]);
    batcher.insertRows("test_table", [{ id: 2, name: "b", value: 20 }]);

    // Not yet flushed (2 < 3)
    let rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(0);

    // This should trigger auto-flush (3 >= 3)
    batcher.insertRows("test_table", [{ id: 3, name: "c", value: 30 }]);

    rows = db.query("SELECT * FROM test_table").all();
    expect(rows).toHaveLength(3);
  });

  test("flushes specific table", () => {
    db.exec(
      "CREATE TABLE other_table (id INTEGER PRIMARY KEY, data TEXT)",
    );
    const batcher = createBatchingInserter(db, 100);

    batcher.insertRows("test_table", [{ id: 1, name: "a", value: 10 }]);
    batcher.insertRows("other_table", [{ id: 1, data: "x" }]);

    batcher.flush("test_table");

    const testRows = db.query("SELECT * FROM test_table").all();
    const otherRows = db.query("SELECT * FROM other_table").all();
    expect(testRows).toHaveLength(1);
    expect(otherRows).toHaveLength(0);

    batcher.flushAll();
    const otherRowsAfter = db.query("SELECT * FROM other_table").all();
    expect(otherRowsAfter).toHaveLength(1);
  });
});

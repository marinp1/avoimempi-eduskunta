import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  AUXILIARY_REF_TABLES,
  getAuxiliaryRepresentativeOrphanQuery,
  getRowCountQuery,
  ROW_COUNT_TABLES,
  SALIDB_LINKAGE_CHECKS,
  sanityQueries,
} from "../database/sanity-queries";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("Sanity query centralization", () => {
  test("all sanity queries compile", () => {
    const entries = Object.entries(sanityQueries);

    for (const [name, sql] of entries) {
      const stmt = db.prepare(sql);
      stmt.finalize();
      expect(name.length).toBeGreaterThan(0);
      expect(sql.length).toBeGreaterThan(0);
    }
  });

  test("all sanity queries execute", () => {
    const entries = Object.entries(sanityQueries);

    for (const [, sql] of entries) {
      const stmt = db.prepare(sql);
      stmt.get();
      stmt.finalize();
    }

    expect(entries.length).toBeGreaterThan(0);
  });

  test("row count query builder executes for each supported table", () => {
    for (const table of ROW_COUNT_TABLES) {
      const stmt = db.prepare(getRowCountQuery(table));
      const row = stmt.get() as any;
      stmt.finalize();

      expect(typeof row.c).toBe("number");
    }
  });

  test("auxiliary orphan query builder executes for each auxiliary table", () => {
    for (const table of AUXILIARY_REF_TABLES) {
      const stmt = db.prepare(getAuxiliaryRepresentativeOrphanQuery(table));
      const row = stmt.get() as any;
      stmt.finalize();

      expect(typeof row.c).toBe("number");
    }
  });

  test("all SaliDB linkage queries execute", () => {
    for (const check of SALIDB_LINKAGE_CHECKS) {
      const stmt = db.prepare(check.sql);
      const row = stmt.get() as any;
      stmt.finalize();

      expect(typeof row.c).toBe("number");
    }
  });

  test("votingIndividualCountMismatch flags votings with non-zero n_total and zero Vote rows", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, n_total, n_yes, n_no, n_abstain, n_absent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [9901, 99, "2024-01-15T12:00:00.000", "2024/1", 1, 1, 0, 0, 0],
    );

    try {
      const stmt = db.prepare(sanityQueries.votingIndividualCountMismatch);
      const rows = stmt.all() as Array<{ id: number }>;
      stmt.finalize();

      expect(rows.some((row) => row.id === 9901)).toBe(true);
    } finally {
      db.run("DELETE FROM Voting WHERE id = ?", [9901]);
    }
  });

  test("voteAggregationMismatch flags votings with non-zero aggregates and zero Vote rows", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, n_total, n_yes, n_no, n_abstain, n_absent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [9902, 100, "2024-01-15T12:10:00.000", "2024/1", 1, 1, 0, 0, 0],
    );

    try {
      const stmt = db.prepare(sanityQueries.voteAggregationMismatch);
      const rows = stmt.all() as Array<{ id: number }>;
      stmt.finalize();

      expect(rows.some((row) => row.id === 9902)).toBe(true);
    } finally {
      db.run("DELETE FROM Voting WHERE id = ?", [9902]);
    }
  });
});

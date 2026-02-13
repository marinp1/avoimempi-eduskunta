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
});

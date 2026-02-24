import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "fs";
import { join } from "path";
import * as queries from "../database/queries";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const QUERIES_DIR = join(import.meta.dirname, "../database/queries");

const DEFAULT_BINDINGS: Record<string, number | string | null> = {
  $date: "2024-01-15",
  $endDateExclusive: "2024-01-16",
  $id: 100,
  $limit: 50,
  $offset: 0,
  $partyCode: "kesk",
  $personId: 1000,
  $q: "Äänestys",
  $query: "Äänestys",
  $rollCallId: 1,
  $sectionKey: "2024/1/3",
  $sessionKey: "2024/1",
  $startDate: "2024-01-01",
  $threshold: 10,
};

const normalizeSql = (sql: string) => sql.replace(/\s+/g, " ").trim();

const getBindingsForSql = (
  sql: string,
): Record<string, number | string | null> => {
  const bindings: Record<string, number | string | null> = {};
  const parameterNames = new Set<string>();

  for (const match of sql.matchAll(/\$[A-Za-z_][A-Za-z0-9_]*/g)) {
    parameterNames.add(match[0]);
  }

  for (const parameterName of parameterNames) {
    bindings[parameterName] = DEFAULT_BINDINGS[parameterName] ?? 1;
  }

  return bindings;
};

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("All SQL query files", () => {
  test("every SQL file is exported by database/queries.ts", () => {
    const exportedSqlQueries = Object.values(queries).filter(
      (value): value is string => typeof value === "string",
    );
    const exportedSqlSet = new Set(
      exportedSqlQueries.map((sqlText) => normalizeSql(sqlText)),
    );

    const queryFiles = readdirSync(QUERIES_DIR)
      .filter((filename) => filename.endsWith(".sql"))
      .sort();

    expect(queryFiles.length).toBeGreaterThan(0);
    expect(exportedSqlQueries.length).toBe(queryFiles.length);

    for (const queryFile of queryFiles) {
      const fileSql = readFileSync(join(QUERIES_DIR, queryFile), "utf-8");
      expect(exportedSqlSet.has(normalizeSql(fileSql))).toBe(true);
    }
  });

  test("every exported SQL query executes with default bindings", () => {
    const queryEntries = Object.entries(queries).filter(
      ([, value]) => typeof value === "string",
    ) as Array<[string, string]>;

    for (const [queryName, querySql] of queryEntries) {
      const stmt = db.prepare(querySql);
      const bindings = getBindingsForSql(querySql);
      stmt.all(bindings);
      stmt.finalize();

      expect(queryName.length).toBeGreaterThan(0);
      expect(querySql.length).toBeGreaterThan(0);
    }
  });
});

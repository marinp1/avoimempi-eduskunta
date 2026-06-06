import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { listQueryFiles } from "../src/database/query-audit";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

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
  $sessionKeysJson: '["2024/1","2024/2"]',
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
  test("every SQL file has content", () => {
    const queryFiles = listQueryFiles();

    expect(queryFiles.length).toBeGreaterThan(0);

    for (const { filePath } of queryFiles) {
      const fileSql = readFileSync(filePath, "utf-8");
      expect(normalizeSql(fileSql).length).toBeGreaterThan(0);
    }
  });

  test("every SQL query file executes with default bindings", () => {
    const queryFiles = listQueryFiles();

    for (const { queryFile, filePath } of queryFiles) {
      const querySql = readFileSync(filePath, "utf-8");
      const stmt = db.prepare(querySql);
      const bindings = getBindingsForSql(querySql);
      stmt.all(bindings);
      stmt.finalize();

      expect(queryFile.length).toBeGreaterThan(0);
      expect(querySql.length).toBeGreaterThan(0);
    }
  });
});

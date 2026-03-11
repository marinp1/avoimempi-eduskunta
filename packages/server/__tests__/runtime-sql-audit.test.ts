import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  collectServerQueryAudit,
  summarizeQueryAudit,
} from "../database/query-audit";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const QUERIES_DIR = join(import.meta.dirname, "../database/queries");

const DEFAULT_BINDINGS: Record<string, number | string | null> = {
  $asOfDate: "2024-01-15",
  $date: "2024-01-15",
  $endDateExclusive: "2024-01-16",
  $exactQuery: "Matti Meikäläinen",
  $governmentName: "Orpon hallitus",
  $governmentStartDate: "2023-06-20",
  $id: 100,
  $identifier: "HE 1/2024",
  $initiativeTypeCode: "LA",
  $limit: 50,
  $offset: 0,
  $partyCode: "kesk",
  $personId: 1000,
  $prefixQuery: "Matti%",
  $q: "Äänestys",
  $query: "Äänestys",
  $recipientCommittee: "SuV",
  $rollCallId: 1,
  $sectionKey: "2024/1/3",
  $sessionKeysJson: '["2024/1","2024/2"]',
  $sessionKey: "2024/1",
  $sourceCommittee: "VaV",
  $sourceReference: "KK 100/2024",
  $startDate: "2024-01-01",
  $subject: "verotus",
  $tableName: "MemberOfParliament",
  $threshold: 10,
  $year: "2024",
};

function getBindingsForSql(sql: string): Record<string, number | string | null> {
  const bindings: Record<string, number | string | null> = {};
  const parameterNames = new Set<string>();

  for (const match of sql.matchAll(/\$[A-Za-z_][A-Za-z0-9_]*/g)) {
    parameterNames.add(match[0]);
  }

  for (const parameterName of parameterNames) {
    bindings[parameterName] = DEFAULT_BINDINGS[parameterName] ?? 1;
  }

  return bindings;
}

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("runtime SQL audit", () => {
  test("runtime SQL files have no test-only or unimported queries", () => {
    const records = collectServerQueryAudit();
    const summary = summarizeQueryAudit(records);

    expect(summary.testOnlyQueries).toEqual([]);
    expect(summary.unimportedQueries).toEqual([]);
  });

  test("every runtime SQL file executes against the seeded test database", () => {
    const records = collectServerQueryAudit().filter((record) => record.isRuntimeUsed);

    expect(records.length).toBeGreaterThan(0);

    for (const record of records) {
      const sql = readFileSync(join(QUERIES_DIR, record.queryFile), "utf8");
      const stmt = db.prepare(sql);
      stmt.all(getBindingsForSql(sql));
      stmt.finalize();
    }
  });
});

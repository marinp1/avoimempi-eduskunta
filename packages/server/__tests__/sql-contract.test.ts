/**
 * Runtime half of the SQL↔type contract (the compile-time half is in
 * sql-contract.test-d.ts).
 *
 *   keyof Type  ==(test-d, compile time)==  TYPE_COLUMN_CONTRACTS[Type]
 *   contract    ⊆(here, runtime)========  actual SQL output columns
 *   ⇒ every key a query-result type promises is really produced by the SQL.
 *
 * RESIDUAL RISK — read before trusting this suite:
 * `db.prepare<Result>()` is an unchecked cast, so these tests, not the types, are
 * the guarantee. They only catch what the SEED FIXTURES exercise. A column whose
 * nullability/shape is never produced by `seedFullDataset()` / `seedEdgeCases()` can
 * still drift silently. Treat the fixtures as a first-class contract: when you add a
 * query or discover a null-producing case in production, add the row to the seed and
 * an assertion here. Coverage today is partial — queries that return 0 rows on the
 * seed have no shape snapshot (see the coverage summary log).
 */
import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import {
  readFileSync,
  writeFileSync,
  existsSync,
  readdirSync,
  mkdirSync,
  rmSync,
} from "node:fs";
import { join } from "node:path";
import {
  collectServerQueryAudit,
  summarizeQueryAudit,
} from "../database/query-audit";
import {
  SQL_TYPE_REGISTRY,
  TYPE_COLUMN_CONTRACTS,
} from "../database/sql-type-registry";
import { PersonRepository } from "../database/repositories/person-repository";
import {
  createTestDb,
  seedFullDataset,
  seedEdgeCases,
} from "./helpers/setup-db";

const QUERIES_DIR = join(import.meta.dirname, "../database/queries");
// One snapshot file per query (e.g. sql-snapshots/VOTING_BY_ID.sql.json) so diffs
// stay localized and the directory scales to hundreds of queries without a single
// giant file or merge conflicts.
const SNAPSHOT_DIR = join(import.meta.dirname, "sql-snapshots");
const snapshotPathFor = (queryFile: string) =>
  join(SNAPSHOT_DIR, `${queryFile}.json`);
// RESET wipes the whole snapshot directory and rebuilds from scratch (drops every
// stored shape, including any orphaned/manually-added files). UPDATE keeps the
// directory and rewrites/prunes in place. RESET implies UPDATE.
const RESET_SNAPSHOTS = process.env.SQL_RESET_SNAPSHOTS === "1";
const UPDATE_SNAPSHOTS =
  process.env.SQL_UPDATE_SNAPSHOTS === "1" || RESET_SNAPSHOTS;

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
  $q: "Aanestys",
  $query: "Aanestys",
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

/**
 * Per-query binding overrides for queries whose generic bindings don't match the
 * seed (search terms that hit no seeded name, or optional filter params that the
 * `?? 1` fallback would wrongly set to a non-matching value instead of NULL).
 * Without these, the query returns 0 rows and gets no shape snapshot.
 */
const QUERY_BINDING_OVERRIDES: Record<
  string,
  Record<string, number | string | null>
> = {
  // $query="Aanestys" matches no seeded MP name; "Matti" matches person 1000.
  "PERSON_SEARCH.sql": { $query: "Matti" },
  // FTS over the seeded "Hallituksen esitys" rows.
  "VOTINGS_SEARCH.sql": { $q: "esitys", $query: "esitys" },
  // Optional filters must be NULL (no filter); the `?? 1` fallback would set
  // $session/$phase to 1 and exclude every row.
  "VOTINGS_BROWSE.sql": {
    $query: null,
    $session: null,
    $phase: null,
    $sort: "newest",
  },
  // Only person 1002 has a government membership in the seed.
  "GOVERNMENT_MEMBERSHIPS.sql": { $personId: 1002 },
};

function getBindingsForSql(
  sql: string,
  queryFile?: string,
): Record<string, number | string | null> {
  const bindings: Record<string, number | string | null> = {};
  const parameterNames = new Set<string>();
  for (const match of sql.matchAll(/\$[A-Za-z_][A-Za-z0-9_]*/g)) {
    parameterNames.add(match[0]);
  }
  const overrides = queryFile ? QUERY_BINDING_OVERRIDES[queryFile] : undefined;
  for (const parameterName of parameterNames) {
    if (overrides && parameterName in overrides) {
      bindings[parameterName] = overrides[parameterName]!;
    } else {
      bindings[parameterName] = DEFAULT_BINDINGS[parameterName] ?? 1;
    }
  }
  return bindings;
}

interface ColumnShape {
  columns: Record<string, string>;
  hasNulls: Record<string, boolean>;
  rowCount: number;
}

type Snapshots = Record<string, ColumnShape>;

function extractColumnShape(
  db: Database,
  sql: string,
  bindings: Record<string, number | string | null>,
): ColumnShape | null {
  const stmt = db.prepare(sql);
  let rows: unknown[];
  try {
    rows = stmt.all(bindings);
  } catch {
    stmt.finalize();
    return null;
  }
  stmt.finalize();

  if (rows.length === 0) return null;

  const firstRow = rows[0] as Record<string, unknown>;
  const columns: Record<string, string> = {};
  const hasNulls: Record<string, boolean> = {};

  for (const key of Object.keys(firstRow).sort()) {
    columns[key] = firstRow[key] === null ? "null" : typeof firstRow[key];
    hasNulls[key] = firstRow[key] === null;
  }

  for (const row of rows) {
    const r = row as Record<string, unknown>;
    for (const key of Object.keys(columns)) {
      if (r[key] === null) {
        hasNulls[key] = true;
      }
      if (r[key] !== null && columns[key] === "null") {
        columns[key] = typeof r[key];
      }
    }
  }

  return { columns, hasNulls, rowCount: rows.length };
}

function loadSnapshots(): Snapshots {
  if (!existsSync(SNAPSHOT_DIR)) return {};
  const snapshots: Snapshots = {};
  for (const fileName of readdirSync(SNAPSHOT_DIR)) {
    if (!fileName.endsWith(".json")) continue;
    const queryFile = fileName.slice(0, -".json".length);
    snapshots[queryFile] = JSON.parse(
      readFileSync(join(SNAPSHOT_DIR, fileName), "utf8"),
    );
  }
  return snapshots;
}

function saveSnapshots(snapshots: Snapshots): void {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  const expected = new Set(
    Object.keys(snapshots).map((queryFile) => `${queryFile}.json`),
  );
  // Prune stale snapshot files (queries that no longer produce a shape).
  for (const fileName of readdirSync(SNAPSHOT_DIR)) {
    if (fileName.endsWith(".json") && !expected.has(fileName)) {
      rmSync(join(SNAPSHOT_DIR, fileName));
    }
  }
  for (const [queryFile, shape] of Object.entries(snapshots)) {
    writeFileSync(
      snapshotPathFor(queryFile),
      JSON.stringify(shape, null, 2) + "\n",
    );
  }
}

let db: Database;
let computedShapes: Map<string, ColumnShape | null>;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);

  computedShapes = new Map();
  const records = collectServerQueryAudit().filter(
    (record) => record.isRuntimeUsed,
  );
  for (const record of records) {
    const sql = readFileSync(join(QUERIES_DIR, record.queryFile), "utf8");
    const shape = extractColumnShape(
      db,
      sql,
      getBindingsForSql(sql, record.queryFile),
    );
    computedShapes.set(record.queryFile, shape);
  }
});

afterAll(() => {
  db.close();
});

const runtimeRecords = collectServerQueryAudit().filter(
  (record) => record.isRuntimeUsed,
);

describe("SQL contract tests", () => {
  test("runtime SQL files have no test-only or unimported queries", () => {
    const summary = summarizeQueryAudit(collectServerQueryAudit());
    expect(summary.testOnlyQueries).toEqual([]);
    expect(summary.unimportedQueries).toEqual([]);
  });

  test("every runtime SQL file executes against the seeded test database", () => {
    expect(runtimeRecords.length).toBeGreaterThan(0);
    for (const record of runtimeRecords) {
      const shape = computedShapes.get(record.queryFile);
      if (shape !== undefined) {
        if (shape === null) {
          const sql = readFileSync(join(QUERIES_DIR, record.queryFile), "utf8");
          const stmt = db.prepare(sql);
          const rows = stmt.all(getBindingsForSql(sql, record.queryFile));
          stmt.finalize();
          expect(rows.length).toBe(0);
        } else {
          expect(shape.rowCount).toBeGreaterThan(0);
        }
      }
    }
  });

  if (UPDATE_SNAPSHOTS) {
    test(
      RESET_SNAPSHOTS
        ? "reset column shape snapshots"
        : "generate column shape snapshots",
      () => {
        if (RESET_SNAPSHOTS && existsSync(SNAPSHOT_DIR)) {
          rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
        }
        const snapshots: Snapshots = {};
        for (const record of runtimeRecords) {
          const shape = computedShapes.get(record.queryFile);
          if (shape) {
            snapshots[record.queryFile] = shape;
          }
        }
        saveSnapshots(snapshots);
        expect(Object.keys(snapshots).length).toBeGreaterThan(0);
      },
    );
  } else {
    const existingSnapshots = loadSnapshots();

    describe("column shape verification", () => {
      for (const record of runtimeRecords) {
        const { queryFile } = record;
        const expected = existingSnapshots[queryFile];
        const registration = SQL_TYPE_REGISTRY[queryFile];

        if (!expected) continue;

        test(`${queryFile} column names match (type: ${registration?.typeName ?? "inline"})`, () => {
          const actual = computedShapes.get(queryFile);
          expect(actual).not.toBeNull();
          const actualCols = Object.keys(actual!.columns).sort();
          const expectedCols = Object.keys(expected.columns).sort();
          expect(actualCols).toEqual(expectedCols);
        });

        test(`${queryFile} column types match`, () => {
          const actual = computedShapes.get(queryFile)!;
          const mismatches: string[] = [];
          for (const col of Object.keys(expected.columns)) {
            const actualType = actual.columns[col];
            const expectedType = expected.columns[col];
            if (actualType !== undefined && actualType !== expectedType) {
              mismatches.push(
                `  ${col}: expected "${expectedType}", got "${actualType}"`,
              );
            }
          }
          if (mismatches.length > 0) {
            expect(`\n${mismatches.join("\n")}`).toBe("");
          }
          expect(true).toBe(true);
        });

        test(`${queryFile} nullability matches`, () => {
          const actual = computedShapes.get(queryFile)!;
          const mismatches: string[] = [];
          for (const col of Object.keys(expected.hasNulls)) {
            const actualNull = actual.hasNulls[col];
            const expectedNull = expected.hasNulls[col];
            if (actualNull !== expectedNull && !expectedNull && actualNull) {
              mismatches.push(
                `  ${col}: now nullable (was non-null in snapshot)`,
              );
            }
          }
          if (mismatches.length > 0) {
            expect(`\n${mismatches.join("\n")}`).toBe("");
          }
          expect(true).toBe(true);
        });
      }
    });

    test("snapshot coverage summary", () => {
      const withSnapshots = runtimeRecords.filter(
        (r) => existingSnapshots[r.queryFile],
      );
      const registered = runtimeRecords.filter(
        (r) => SQL_TYPE_REGISTRY[r.queryFile],
      );
      console.log(
        `\n${withSnapshots.length}/${runtimeRecords.length} runtime queries have column snapshots`,
      );
      console.log(
        `${registered.length} queries are registered with named types.\n`,
      );
      expect(runtimeRecords.length).toBeGreaterThan(0);
    });
  }

  // Runtime half of the type binding: every column a registered query-result type
  // promises (TYPE_COLUMN_CONTRACTS) must actually be produced by every query mapped
  // to that type. Combined with sql-contract.test-d.ts (keyof Type === contract) this
  // proves keyof Type ⊆ actual SQL columns — i.e. the type cannot promise a column
  // the SQL does not return.
  describe("registered types: contract columns are produced by the SQL", () => {
    for (const record of runtimeRecords) {
      const typeName = SQL_TYPE_REGISTRY[record.queryFile]?.typeName;
      if (!typeName || !(typeName in TYPE_COLUMN_CONTRACTS)) continue;
      const contract =
        TYPE_COLUMN_CONTRACTS[typeName as keyof typeof TYPE_COLUMN_CONTRACTS];

      test(`${record.queryFile} produces all ${typeName} columns`, () => {
        const shape = computedShapes.get(record.queryFile);
        if (!shape) return; // 0-row queries can't be checked on this seed; skip.
        const actual = new Set(Object.keys(shape.columns));
        const missing = contract.filter((col) => !actual.has(col));
        expect(missing).toEqual([]);
      });
    }
  });
});

// Part B: adversarial fixtures. seedEdgeCases() adds the awkward rows the happy-path
// seed omits; here we prove the data layer tolerates them rather than assuming the
// happy-path snapshot's nullability is the whole story.
describe("SQL contract — edge-case fixtures", () => {
  let edgeDb: Database;

  beforeAll(() => {
    edgeDb = createTestDb();
    seedFullDataset(edgeDb);
    seedEdgeCases(edgeDb);
  });

  afterAll(() => {
    edgeDb.close();
  });

  test("roster includes the sparse MP with a null district and defaulted participation", () => {
    const roster = new PersonRepository(edgeDb).fetchRoster();
    const sparse = roster.find((r) => r.person_id === 1003);
    expect(sparse).toBeDefined();
    // No district row → LEFT JOIN yields null (the type already allows it).
    expect(sparse!.district_name).toBeNull();
    // participation_rate is COALESCE(..., 0) in the query, so it stays non-null.
    expect(sparse!.participation_rate).toBe(0);
    expect(sparse!.group_abbreviation).toBe("kesk");
  });

  test("every runtime query still executes against the edge-augmented seed", () => {
    for (const record of runtimeRecords) {
      const sql = readFileSync(join(QUERIES_DIR, record.queryFile), "utf8");
      const stmt = edgeDb.prepare(sql);
      expect(() =>
        stmt.all(getBindingsForSql(sql, record.queryFile)),
      ).not.toThrow();
      stmt.finalize();
    }
  });
});

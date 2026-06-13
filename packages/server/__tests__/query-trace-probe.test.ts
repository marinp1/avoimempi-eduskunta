/**
 * Contract for the on-demand "trace probe" engine.
 *
 * The probe lets the data-trace overlay recover a source table's individual
 * record PKs *without* touching the page's real queries: it replays a query's
 * FROM/JOIN/WHERE (filters + params intact) but projects only the source PK.
 * This suite pins the pure parts:
 *   - alias-aware FROM/JOIN extraction at the outer (depth-0) level;
 *   - probeTargetsFor: which (alias → source PK) a query can be probed for, and
 *     that aggregate / CTE-buried / unsafe queries yield none;
 *   - buildProbeQuery: the SELECT-list swap + trailing-clause strip + LIMIT, and
 *     that it refuses unsafe shapes;
 *   - referencedParamNames: only params still present after stripping are bound.
 */
import { readFileSync } from "node:fs";
import { describe, expect, test } from "bun:test";
import { listQueryFiles } from "../src/database/query-audit";
import {
  buildProbeQuery,
  extractAliases,
  probeTargetsFor,
  referencedParamNames,
} from "../src/database/query-trace-probe";

function sqlFor(queryFile: string): string {
  const entry = listQueryFiles().find((f) => f.queryFile === queryFile);
  if (!entry) throw new Error(`missing fixture query: ${queryFile}`);
  return readFileSync(entry.filePath, "utf8");
}

describe("extractAliases", () => {
  test("resolves outer FROM/JOIN tables with their aliases", () => {
    const aliases = extractAliases(
      "SELECT v.id FROM Vote v LEFT JOIN Representative r ON r.person_id = v.person_id WHERE v.voting_id = $id",
    );
    expect(aliases).toContainEqual({ alias: "v", table: "Vote" });
    expect(aliases).toContainEqual({ alias: "r", table: "Representative" });
  });

  test("ignores tables nested inside parentheses (CTEs / subqueries)", () => {
    const aliases = extractAliases(
      "WITH c AS (SELECT id FROM Secret s) SELECT v.id FROM Vote v JOIN c ON c.id = v.id",
    );
    // `Secret s` lives inside the CTE parens — not an outer-level table.
    expect(aliases.some((a) => a.table === "Secret")).toBeFalse();
    expect(aliases).toContainEqual({ alias: "v", table: "Vote" });
  });
});

describe("probeTargetsFor", () => {
  test("voting-member-votes: both the vote and the representative are probe targets", () => {
    const targets = probeTargetsFor("voting-member-votes.sql");
    expect(targets).toContainEqual(
      expect.objectContaining({
        alias: "v",
        sourceTable: "SaliDBAanestysEdustaja",
        pkCol: "id",
      }),
    );
    expect(targets).toContainEqual(
      expect.objectContaining({
        alias: "r",
        sourceTable: "MemberOfParliament",
        pkCol: "person_id",
      }),
    );
  });

  test("voting-detail: the voting is a probe target; the subquery alias is not", () => {
    const targets = probeTargetsFor("voting-detail.sql");
    expect(targets).toContainEqual(
      expect.objectContaining({
        alias: "v",
        sourceTable: "SaliDBAanestys",
        pkCol: "id",
      }),
    );
    expect(targets.some((t) => t.alias === "dr")).toBeFalse();
  });

  test("person-detail: representative is a probe target", () => {
    const targets = probeTargetsFor("person-detail.sql");
    expect(targets).toContainEqual(
      expect.objectContaining({
        alias: "r",
        sourceTable: "MemberOfParliament",
        pkCol: "person_id",
      }),
    );
  });

  test("aggregate query (voting-party-breakdown) yields no probe targets", () => {
    expect(probeTargetsFor("voting-party-breakdown.sql")).toEqual([]);
  });
});

describe("buildProbeQuery", () => {
  test("rewrites the SELECT list to the source PK, keeps FROM/WHERE, drops ORDER BY, adds LIMIT", () => {
    const probe = buildProbeQuery(
      sqlFor("voting-member-votes.sql"),
      { alias: "v", pkCol: "id" },
      [],
    );
    expect(probe).not.toBeNull();
    const sql = probe!;
    expect(sql).toContain("SELECT DISTINCT");
    expect(sql).toContain("v.id");
    expect(sql).toContain("FROM Vote v");
    expect(sql).toContain("WHERE v.voting_id = $id");
    // original projection is gone, trailing ORDER BY is stripped, LIMIT appended
    expect(sql).not.toContain("is_government");
    expect(sql).not.toMatch(/ORDER BY/i);
    expect(sql).toMatch(/LIMIT\s+\d+\s*;?\s*$/i);
  });

  test("includes requested label columns in the projection", () => {
    const sql = buildProbeQuery(
      sqlFor("voting-member-votes.sql"),
      { alias: "r", pkCol: "person_id" },
      ["first_name", "last_name"],
    )!;
    expect(sql).toContain("r.person_id");
    expect(sql).toContain("r.first_name");
    expect(sql).toContain("r.last_name");
  });

  test("strips params that only appeared in the dropped clauses", () => {
    const sql = buildProbeQuery(
      "SELECT a FROM Foo f WHERE f.x = $id ORDER BY f.y LIMIT $limit",
      { alias: "f", pkCol: "x" },
      [],
    )!;
    expect(sql).toContain("$id");
    expect(sql).not.toContain("$limit");
  });

  test("returns null for aggregate shapes and unknown aliases", () => {
    expect(
      buildProbeQuery(
        sqlFor("voting-party-breakdown.sql"),
        { alias: "pr", pkCol: "id" },
        [],
      ),
    ).toBeNull();
    expect(
      buildProbeQuery(
        "SELECT a FROM Foo f WHERE f.x = 1",
        {
          alias: "zzz",
          pkCol: "id",
        },
        [],
      ),
    ).toBeNull();
  });
});

describe("referencedParamNames", () => {
  test("returns the distinct $named params present in a SQL string", () => {
    expect(
      referencedParamNames(
        "SELECT 1 FROM t WHERE a = $id AND b = $id AND c = $q",
      ),
    ).toEqual(["$id", "$q"]);
  });

  test("is empty when there are no named params", () => {
    expect(referencedParamNames("SELECT 1 FROM t")).toEqual([]);
  });
});

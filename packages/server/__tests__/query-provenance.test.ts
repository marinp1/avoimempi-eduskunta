/**
 * Contract for the query → source-dataset trace.
 *
 * Guarantees that every feature SQL file can generate a full data trace:
 *   - the lexical table extractor handles CTEs, aliases, comma joins, table
 *     functions and views, and
 *   - every final table any query reads is mapped in SOURCE_LINEAGE (or is an
 *     explicitly allow-listed non-source table).
 *
 * If a new query references a table with no lineage entry, this fails — add the
 * entry to `packages/shared/constants/SourceLineage.ts` (or, for an infra/search
 * table, to NON_SOURCE_TABLES) so the table's provenance is never silently lost.
 */
import { describe, expect, test } from "bun:test";
import {
  extractTables,
  getQuerySources,
  provenanceForSql,
} from "../src/database/query-provenance";
import { TABLE_META } from "../src/domain/provenance";

describe("extractTables", () => {
  test("ignores CTE names and the CTE's own FROM-less definition", () => {
    const sql = `
      WITH active AS (SELECT * FROM Representative),
           recent AS (SELECT * FROM Voting)
      SELECT * FROM active JOIN recent ON 1=1`;
    expect(extractTables(sql)).toEqual(["Representative", "Voting"]);
  });

  test("handles aliases and comma joins", () => {
    const sql = `SELECT * FROM Vote v, Voting AS vo JOIN Representative r ON 1=1`;
    expect(extractTables(sql)).toEqual(["Representative", "Vote", "Voting"]);
  });

  test("skips table-valued functions like json_each", () => {
    const sql = `SELECT * FROM Section s, json_each(s.keys) JOIN Speech ON 1=1`;
    expect(extractTables(sql)).toEqual(["Section", "Speech"]);
  });

  test("expands views to their base tables", () => {
    const sql = `SELECT * FROM CurrentGovernmentCoalition`;
    expect(extractTables(sql)).toEqual([
      "Government",
      "GovernmentMembership",
      "ParliamentaryGroupMembership",
      "Representative",
    ]);
  });

  test("ignores tables mentioned only in comments or strings", () => {
    const sql = `
      -- FROM NotARealTable
      SELECT 'FROM AlsoNotReal' AS x FROM Voting`;
    expect(extractTables(sql)).toEqual(["Voting"]);
  });
});

describe("provenanceForSql", () => {
  test("maps final tables to distinct source datasets", () => {
    const p = provenanceForSql(
      `SELECT * FROM Vote JOIN Voting ON 1=1 JOIN Representative ON 1=1`,
    );
    expect(p.sources).toEqual([
      "MemberOfParliament",
      "SaliDBAanestys",
      "SaliDBAanestysEdustaja",
    ]);
    expect(p.unmapped).toEqual([]);
  });
});

describe("every feature query is fully mapped", () => {
  const map = getQuerySources();

  test("no query references an unmapped table", () => {
    const offenders = [...map.entries()]
      .filter(([, p]) => p.unmapped.length > 0)
      .map(([q, p]) => `${q}: ${p.unmapped.join(", ")}`);
    expect(offenders).toEqual([]);
  });

  test("every query resolves to at least one source dataset", () => {
    const empty = [...map.entries()]
      .filter(([, p]) => p.sources.length === 0)
      .map(([q]) => q);
    expect(empty).toEqual([]);
  });

  test("every source table has a TABLE_META display name + endpoint", () => {
    const all = new Set<string>();
    for (const p of map.values()) for (const s of p.sources) all.add(s);
    const missing = [...all].filter((t) => !TABLE_META[t]).sort();
    expect(missing).toEqual([]);
  });
});

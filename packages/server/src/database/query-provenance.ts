import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { SOURCE_LINEAGE, type SourceRule } from "#constants/SourceLineage";
import { listQueryFiles } from "./query-audit";

/**
 * Query → source provenance.
 *
 * Turns the set of final tables a SQL query reads (parsed straight from its
 * `FROM`/`JOIN` clauses) into the set of raw API datasets that back it, via
 * `SOURCE_LINEAGE`. This is what lets every query/view generate a full data
 * trace without hand-authoring source lists per figure.
 *
 * The parser is deliberately lexical, not a full SQL grammar: it strips
 * comments and string literals, drops CTE names and table-valued functions,
 * and expands the handful of known views to their base tables. A contract test
 * (`__tests__/query-provenance.test.ts`) asserts every referenced table is
 * either mapped in `SOURCE_LINEAGE` or explicitly allow-listed below, so an
 * unmapped table fails CI rather than silently losing its trace.
 */

/** Views expand to their underlying base tables (only two exist in the schema). */
const VIEW_EXPANSIONS: Record<string, string[]> = {
  InferredGovernmentCoalition: [
    "GovernmentMembership",
    "Government",
    "Representative",
    "ParliamentaryGroupMembership",
  ],
  CurrentGovernmentCoalition: [
    "GovernmentMembership",
    "Government",
    "Representative",
    "ParliamentaryGroupMembership",
  ],
};

/** Table-valued functions / pseudo-tables that may follow FROM but are not real tables. */
const TABLE_FUNCTIONS = new Set([
  "json_each",
  "json_tree",
  "json_group_array",
  "generate_series",
]);

/**
 * Tables that legitimately have no raw API source (infra / search indexes /
 * virtual tables). Referenced by queries but excluded from source resolution.
 */
export const NON_SOURCE_TABLES = new Set<string>([
  "_migration_info",
  "sqlite_master",
  "sqlite_sequence",
  "FederatedSearch",
  "FederatedSearchData",
  "FederatedSearchFts",
]);

function stripNoise(sql: string): string {
  return sql
    .replace(/--[^\n]*/g, " ") // line comments
    .replace(/\/\*[\s\S]*?\*\//g, " ") // block comments
    .replace(/'(?:[^']|'')*'/g, "''") // single-quoted string literals
    .replace(/"(?:[^"]|"")*"/g, '""'); // double-quoted identifiers/strings
}

/** CTE names defined via `WITH x AS (...)` / `, x AS (...)` — excluded from table refs. */
function cteNames(sql: string): Set<string> {
  const names = new Set<string>();
  for (const m of sql.matchAll(/([A-Za-z_][\w]*)\s+AS\s*\(/gi)) {
    names.add(m[1]!);
  }
  return names;
}

/**
 * Extracts the final-table identifiers a query reads, with views expanded and
 * CTEs / table functions removed. Names are returned de-duplicated, sorted.
 */
export function extractTables(rawSql: string): string[] {
  const sql = stripNoise(rawSql);
  const ctes = cteNames(sql);
  const found = new Set<string>();

  for (const m of sql.matchAll(/\b(?:FROM|JOIN)\s+([A-Za-z_][\w]*)/gi)) {
    let name = m[1]!;
    if (TABLE_FUNCTIONS.has(name)) continue;
    if (ctes.has(name)) continue;
    if (name in VIEW_EXPANSIONS) {
      for (const base of VIEW_EXPANSIONS[name]!) found.add(base);
      continue;
    }
    found.add(name);
  }

  // `FROM a, b, c` comma-separated lists (subsequent tables after the first).
  for (const m of sql.matchAll(
    /\bFROM\s+[A-Za-z_][\w]*(?:\s+(?:AS\s+)?[A-Za-z_][\w]*)?((?:\s*,\s*[A-Za-z_][\w]*(?:\s+(?:AS\s+)?[A-Za-z_][\w]*)?)+)/gi,
  )) {
    for (const part of m[1]!.split(",")) {
      const name = part.trim().split(/\s+/)[0]!;
      if (!name) continue;
      if (TABLE_FUNCTIONS.has(name) || ctes.has(name)) continue;
      if (name in VIEW_EXPANSIONS) {
        for (const base of VIEW_EXPANSIONS[name]!) found.add(base);
        continue;
      }
      found.add(name);
    }
  }

  return [...found].sort();
}

export interface QueryProvenance {
  /** Final tables the query reads (views expanded). */
  tables: string[];
  /** Distinct raw API source tables backing those final tables. */
  sources: string[];
  /** Referenced tables with no SOURCE_LINEAGE entry and not allow-listed. */
  unmapped: string[];
}

/** Maps a final table to its source rule, honouring the non-source allow-list. */
export function ruleFor(finalTable: string): SourceRule | undefined {
  return SOURCE_LINEAGE[finalTable];
}

/** Computes the provenance descriptor for a single SQL string. */
export function provenanceForSql(rawSql: string): QueryProvenance {
  const tables = extractTables(rawSql);
  const sources = new Set<string>();
  const unmapped: string[] = [];

  for (const table of tables) {
    if (NON_SOURCE_TABLES.has(table)) continue;
    const rule = SOURCE_LINEAGE[table];
    if (!rule) {
      unmapped.push(table);
      continue;
    }
    sources.add(rule.sourceTable);
  }

  return {
    tables,
    sources: [...sources].sort(),
    unmapped,
  };
}

let cache: Map<string, QueryProvenance> | null = null;

/**
 * Lazily builds and caches `queryFile (basename) → QueryProvenance` across every
 * feature SQL file. Used by ProvenanceService.forQuery and the contract test.
 */
export function getQuerySources(): Map<string, QueryProvenance> {
  if (cache) return cache;
  const map = new Map<string, QueryProvenance>();
  for (const { queryFile, filePath } of listQueryFiles()) {
    map.set(queryFile, provenanceForSql(readFileSync(filePath, "utf8")));
  }
  cache = map;
  return map;
}

/** Provenance for a single query file by basename (e.g. "voting-detail.sql"). */
export function querySourcesFor(
  queryFile: string,
): QueryProvenance | undefined {
  return getQuerySources().get(basename(queryFile));
}

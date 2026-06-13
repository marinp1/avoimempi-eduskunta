import { readFileSync } from "node:fs";
import { SOURCE_LINEAGE } from "#constants/SourceLineage";
import { listQueryFiles } from "./query-audit";

/**
 * On-demand "trace probe" engine.
 *
 * To recover a source table's individual record PKs without touching the page's
 * real queries, the trace overlay *replays* a query as a PK-only probe: keep its
 * `FROM/JOIN/WHERE` (filters + params intact), but project only `<alias>.<pk>`
 * (+ optional label columns). This module is the pure core:
 *   - alias-aware outer-level table extraction (`extractAliases`);
 *   - which (alias → source PK) a query can be probed for (`probeTargetsFor`),
 *     excluding aggregate / set-op / DISTINCT / positional-param shapes and
 *     tables buried inside CTEs or subqueries;
 *   - the SELECT-list swap + trailing-clause strip + `LIMIT` (`buildProbeQuery`).
 *
 * Parsing is deliberately lexical (depth-aware masking), matching the sibling
 * `query-provenance` parser; it is not a full SQL grammar.
 */

/** Max probed records per source (mirrors the passive capture cap). */
const PROBE_LIMIT = 200;

const AGG_FN = /\b(?:SUM|COUNT|AVG|MIN|MAX|TOTAL|GROUP_CONCAT)\s*\(/i;

/** Keywords that may follow `FROM <table>` and are never an alias. */
const NON_ALIAS = new Set([
  "ON",
  "WHERE",
  "GROUP",
  "ORDER",
  "LEFT",
  "RIGHT",
  "INNER",
  "OUTER",
  "FULL",
  "CROSS",
  "JOIN",
  "LIMIT",
  "HAVING",
  "UNION",
  "EXCEPT",
  "INTERSECT",
  "USING",
  "AS",
  "NATURAL",
  "WINDOW",
]);

export interface AliasRef {
  alias: string;
  table: string;
}

export interface ProbeTarget {
  alias: string;
  finalTable: string;
  sourceTable: string;
  pkCol: string;
}

/**
 * Masks the SQL so only depth-0 (outermost) content survives: comments and
 * string literals are blanked, and everything inside parentheses is blanked too
 * (the bracketing parens are kept so e.g. `COUNT(` is still detectable). Length
 * and newlines are preserved, so a match index in the mask maps straight back to
 * the original string.
 */
function maskNested(sql: string): string {
  let out = "";
  let depth = 0;
  let i = 0;
  const n = sql.length;
  while (i < n) {
    const ch = sql[i]!;
    const two = sql.slice(i, i + 2);
    if (two === "--") {
      while (i < n && sql[i] !== "\n") {
        out += " ";
        i++;
      }
      continue;
    }
    if (two === "/*") {
      out += "  ";
      i += 2;
      while (i < n && sql.slice(i, i + 2) !== "*/") {
        out += sql[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) {
        out += "  ";
        i += 2;
      }
      continue;
    }
    if (ch === "'" || ch === '"') {
      out += " ";
      i++;
      while (i < n) {
        if (sql[i] === ch) {
          if (sql[i + 1] === ch) {
            out += "  ";
            i += 2;
            continue;
          }
          out += " ";
          i++;
          break;
        }
        out += sql[i] === "\n" ? "\n" : " ";
        i++;
      }
      continue;
    }
    if (ch === "(") {
      out += "(";
      depth++;
      i++;
      continue;
    }
    if (ch === ")") {
      depth = Math.max(0, depth - 1);
      out += ")";
      i++;
      continue;
    }
    out += depth === 0 ? ch : ch === "\n" ? "\n" : " ";
    i++;
  }
  return out;
}

/** Resolves outer-level `FROM/JOIN <Table> [AS] <alias>` to {alias, table}. */
export function extractAliases(sql: string): AliasRef[] {
  const mask = maskNested(sql);
  const refs: AliasRef[] = [];
  const re =
    /\b(?:FROM|JOIN)\s+([A-Za-z_]\w*)(?:\s+(?:AS\s+)?([A-Za-z_]\w*))?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(mask)) !== null) {
    const table = m[1]!;
    const next = m[2];
    const alias = next && !NON_ALIAS.has(next.toUpperCase()) ? next : table;
    refs.push({ alias, table });
  }
  return refs;
}

/** True for shapes a single PK probe cannot faithfully represent. */
function isUnsafeShape(mask: string): boolean {
  return (
    /\bGROUP\s+BY\b/i.test(mask) ||
    /\b(?:UNION|INTERSECT|EXCEPT)\b/i.test(mask) ||
    /\bSELECT\s+DISTINCT\b/i.test(mask) ||
    AGG_FN.test(mask) ||
    /\?/.test(mask)
  );
}

function targetsFromSql(sql: string): ProbeTarget[] {
  if (isUnsafeShape(maskNested(sql))) return [];
  const targets: ProbeTarget[] = [];
  const seen = new Set<string>();
  for (const { alias, table } of extractAliases(sql)) {
    const rule = SOURCE_LINEAGE[table];
    if (!rule?.sourcePkColumn || !rule.sourcePkName) continue;
    const key = `${alias}|${table}`;
    if (seen.has(key)) continue;
    seen.add(key);
    targets.push({
      alias,
      finalTable: table,
      sourceTable: rule.sourceTable,
      pkCol: rule.sourcePkColumn,
    });
  }
  return targets;
}

let targetsCache: Map<string, ProbeTarget[]> | null = null;

/** Cached `queryFile → probe targets` across every feature SQL file. */
export function probeTargetsFor(queryFile: string): ProbeTarget[] {
  if (!targetsCache) {
    targetsCache = new Map();
    for (const { queryFile: file, filePath } of listQueryFiles()) {
      try {
        targetsCache.set(file, targetsFromSql(readFileSync(filePath, "utf8")));
      } catch {
        targetsCache.set(file, []);
      }
    }
  }
  return targetsCache.get(queryFile) ?? [];
}

/** Distinct `$named` params present in a SQL string, in first-seen order. */
export function referencedParamNames(sql: string): string[] {
  return [...new Set(sql.match(/\$[A-Za-z_]\w*/g) ?? [])];
}

function kwIndex(mask: string, re: RegExp, from = 0): number {
  re.lastIndex = from;
  const m = re.exec(mask);
  return m ? m.index : -1;
}

/**
 * Builds a standalone PK-only probe from a query: keep everything up to and
 * including the main SELECT, replace its projection with `DISTINCT <alias>.<pk>`
 * (+ label columns), keep `FROM…WHERE`, drop the trailing depth-0
 * `GROUP BY/HAVING/ORDER BY/LIMIT`, and append `LIMIT N`. Returns `null` for
 * unsafe shapes or when the alias / main SELECT / FROM can't be located.
 */
export function buildProbeQuery(
  sql: string,
  target: { alias: string; pkCol: string },
  labelCols: string[],
): string | null {
  const mask = maskNested(sql);
  if (isUnsafeShape(mask)) return null;
  if (!extractAliases(sql).some((a) => a.alias === target.alias)) return null;

  const selectIdx = kwIndex(mask, /\bSELECT\b/gi);
  if (selectIdx < 0) return null;
  const selectEnd = selectIdx + "SELECT".length;
  const fromIdx = kwIndex(mask, /\bFROM\b/gi, selectEnd);
  if (fromIdx < 0) return null;

  const tailIdx = kwIndex(
    mask,
    /\b(?:GROUP\s+BY|HAVING|ORDER\s+BY|LIMIT)\b/gi,
    fromIdx,
  );
  const cutAt = tailIdx < 0 ? sql.length : tailIdx;

  const projection = [
    `${target.alias}.${target.pkCol}`,
    ...labelCols.map((c) => `${target.alias}.${c}`),
  ].join(", ");

  const head = sql.slice(0, selectEnd);
  const body = sql.slice(fromIdx, cutAt).trimEnd();
  return `${head} DISTINCT ${projection} ${body} LIMIT ${PROBE_LIMIT}`;
}

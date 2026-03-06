import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ActivePipelineTableNames, AlwaysFullScrapeTables } from "#constants";
import { getChangesReportPath } from "#database";
import { getRawRowStore } from "#storage/row-store/factory";

// ---------------------------------------------------------------------------
// Public types (shared with server + client via JSON)
// ---------------------------------------------------------------------------

export interface DiffHunk {
  op: "add" | "remove" | "keep";
  text: string;
}

export interface FieldChange {
  name: string;
  /** Human-readable summary: "kok → sd", or stats for large fields */
  summary: string;
  /** Structured diff hunks for large string fields (XML etc.) */
  diff?: DiffHunk[];
}

export interface ChangedRowEntry {
  pk: number;
  changedAt: string;
  fields: FieldChange[];
}

export interface TableChanges {
  newRows: number;
  changedRows: ChangedRowEntry[];
}

export interface ChangesReport {
  generatedAt: string;
  previousRebuildAt: string | null;
  totalNewRows: number;
  totalChangedRows: number;
  tables: Record<string, TableChanges>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function tokenizeXml(xml: string): string[] {
  return xml.replace(/></g, ">\n<").split("\n").filter(Boolean);
}

function computeLcsDiff(oldLines: string[], newLines: string[]): DiffHunk[] {
  const m = oldLines.length;
  const n = newLines.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  const result: DiffHunk[] = [];
  let i = m;
  let j = n;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      result.unshift({ op: "keep", text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ op: "add", text: newLines[j - 1] });
      j--;
    } else {
      result.unshift({ op: "remove", text: oldLines[i - 1] });
      i--;
    }
  }
  return result;
}

function buildDiffHunks(
  oldVal: string,
  newVal: string,
  context = 2,
  maxLineLen = 200,
): DiffHunk[] {
  const full = computeLcsDiff(tokenizeXml(oldVal), tokenizeXml(newVal));
  const n = full.length;
  const show = new Set<number>();
  for (let idx = 0; idx < n; idx++) {
    if (full[idx].op !== "keep") {
      for (
        let c = Math.max(0, idx - context);
        c <= Math.min(n - 1, idx + context);
        c++
      ) {
        show.add(c);
      }
    }
  }
  const result: DiffHunk[] = [];
  let prev = -1;
  for (let idx = 0; idx < n; idx++) {
    if (!show.has(idx)) continue;
    if (prev !== -1 && idx > prev + 1) {
      result.push({ op: "keep", text: `… ${idx - prev - 1} unchanged` });
    }
    const { op, text } = full[idx];
    result.push({
      op,
      text: text.length > maxLineLen ? `${text.slice(0, maxLineLen)}…` : text,
    });
    prev = idx;
  }
  return result;
}

function fieldSummary(from: unknown, to: unknown): string {
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return "null";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (s.length > 60) return `${Buffer.byteLength(s, "utf8")} B`;
    return s;
  };
  return `${fmt(from)} → ${fmt(to)}`;
}

function buildFieldChange(
  name: string,
  from: unknown,
  to: unknown,
): FieldChange {
  if (typeof from === "string" && typeof to === "string" && from.length > 60) {
    const diff = buildDiffHunks(from, to);
    const added = diff.filter((d) => d.op === "add").length;
    const removed = diff.filter((d) => d.op === "remove").length;
    return { name, summary: `+${added} / -${removed} lines`, diff };
  }
  return { name, summary: fieldSummary(from, to) };
}

function parseData(json: string): unknown[] {
  try {
    return JSON.parse(json) as unknown[];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Core generator
// ---------------------------------------------------------------------------

export async function generateChangesReport(
  previousRebuildAt: string | null,
): Promise<ChangesReport> {
  const store = getRawRowStore();
  const sinceMs = previousRebuildAt ? Date.parse(previousRebuildAt) : null;
  const generatedAt = new Date().toISOString();

  const tables: Record<string, TableChanges> = {};
  let totalNewRows = 0;
  let totalChangedRows = 0;

  // Count new rows for every active pipeline table
  for (const tableName of ActivePipelineTableNames) {
    const newRows =
      sinceMs !== null ? await store.countNewRows(tableName, sinceMs) : 0;
    tables[tableName] = { newRows, changedRows: [] };
    totalNewRows += newRows;
  }

  // Detailed field-level changes for tables that track in-place updates
  if (sinceMs !== null) {
    for (const tableName of AlwaysFullScrapeTables) {
      const changed = await store.listChangedRows(tableName, sinceMs);
      if (changed.length === 0) continue;

      const schemas = await store.listColumnSchemas(tableName);
      const schemaMap = new Map(schemas.map((s) => [s.hash, s]));

      const changedRows: ChangedRowEntry[] = [];

      for (const summary of changed) {
        const [revisions, current] = await Promise.all([
          store.listRevisions(tableName, summary.pk),
          store.get(tableName, summary.pk),
        ]);
        if (!current) continue;

        // Revisions that happened since the last rebuild
        const revsAfter = revisions.filter(
          (r) => Date.parse(r.supersededAt) >= sinceMs,
        );
        if (revsAfter.length === 0) continue;

        // State just before the first change since last rebuild
        const stateBefore = parseData(revsAfter[0].data);
        const stateAfter = parseData(current.data);

        const schema = schemaMap.get(revsAfter[0].columnHash);
        const colNames = schema?.columnNames ?? [];

        const fields: FieldChange[] = [];
        const len = Math.max(stateBefore.length, stateAfter.length);
        for (let i = 0; i < len; i++) {
          if (
            JSON.stringify(stateBefore[i]) !== JSON.stringify(stateAfter[i])
          ) {
            fields.push(
              buildFieldChange(
                colNames[i] ?? `col[${i}]`,
                stateBefore[i],
                stateAfter[i],
              ),
            );
          }
        }

        if (fields.length > 0) {
          changedRows.push({
            pk: summary.pk,
            changedAt: summary.updatedAt,
            fields,
          });
        }
      }

      tables[tableName] = {
        ...(tables[tableName] ?? { newRows: 0 }),
        changedRows,
      };
      totalChangedRows += changedRows.length;
    }
  }

  return {
    generatedAt,
    previousRebuildAt,
    totalNewRows,
    totalChangedRows,
    tables,
  };
}

// ---------------------------------------------------------------------------
// Save to disk
// ---------------------------------------------------------------------------

export async function generateAndSaveChangesReport(
  previousRebuildAt: string | null,
): Promise<ChangesReport> {
  const report = await generateChangesReport(previousRebuildAt);
  const reportPath = getChangesReportPath();
  mkdirSync(path.dirname(reportPath), { recursive: true });
  writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
  console.log(
    `📋 Changes report saved: ${report.totalNewRows} new rows, ${report.totalChangedRows} changed rows`,
  );
  return report;
}

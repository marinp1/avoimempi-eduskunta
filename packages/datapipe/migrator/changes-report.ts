import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { ActivePipelineTableNames, AlwaysFullScrapeTables } from "#constants";
import { getChangesReportPath } from "#database";
import { getRawRowStore } from "#storage/row-store/factory";

// ---------------------------------------------------------------------------
// Public types (shared with server + client via JSON)
// ---------------------------------------------------------------------------

export interface FieldChange {
  name: string;
  /** Human-readable summary: "kok → sd", "7946 B → 8329 B", etc. */
  summary: string;
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

function fieldSummary(from: unknown, to: unknown): string {
  const fmt = (v: unknown): string => {
    if (v === null || v === undefined) return "null";
    const s = typeof v === "string" ? v : JSON.stringify(v);
    if (s.length > 60) return `${Buffer.byteLength(s, "utf8")} B`;
    return s;
  };
  return `${fmt(from)} → ${fmt(to)}`;
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
          if (JSON.stringify(stateBefore[i]) !== JSON.stringify(stateAfter[i])) {
            fields.push({
              name: colNames[i] ?? `col[${i}]`,
              summary: fieldSummary(stateBefore[i], stateAfter[i]),
            });
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

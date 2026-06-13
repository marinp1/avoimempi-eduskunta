import { SOURCE_LINEAGE } from "#constants/SourceLineage";
import { querySourcesFor } from "#server/database/query-provenance";
import type { TraceRepository } from "#server/database/trace.repository";
import { TABLE_META } from "#server/domain/provenance";
import { formatFiDateTime } from "#server/helpers";

/**
 * Page-level data trace: the full lineage of everything rendered on a page,
 * derived from the set of SQL files that fed it.
 *
 * Lineage flows left to right across five layers:
 *   avoindata.eduskunta.fi → raw source tables → final DB tables → SQL queries → this view
 * Built purely from `querySourcesFor` (SQL → tables/sources), `SOURCE_LINEAGE`
 * (final table → raw source), `TABLE_META` (display name + endpoint) and the
 * optional trace DB (`TraceRepository.getSummary` for row counts / last fetched).
 */

export const TRACE_API_BASE = "avoindata.eduskunta.fi";
const API_URL_BASE = "https://avoindata.eduskunta.fi/api/v1/tables";

/**
 * Raw API source table → its trace PK name, derived from SOURCE_LINEAGE (the
 * authority verified against the live DB). Preferred over the shared
 * `PrimaryKeys` constant, which is empty for some tables (e.g. SaliDBPuheenvuoro).
 */
const SOURCE_PK_NAME: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const rule of Object.values(SOURCE_LINEAGE)) {
    if (rule.sourcePkName) map[rule.sourceTable] = rule.sourcePkName;
  }
  return map;
})();

/** A deep link to one individual source record via the batch API. */
export interface TraceRecordLink {
  value: string;
  url: string;
  label?: string;
}

/** A raw API source dataset (layer 2). */
export interface TraceSourceNode {
  table: string;
  displayName: string;
  endpoint: string;
  apiUrl: string;
  importedRows: number | null;
  lastFetched: string | null;
  /** Raw-store PK column name (e.g. "AanestysId"), null when not row-traceable. */
  pkName: string | null;
}

/** A final DB table the page reads (layer 3), with the source it derives from. */
export interface TraceFinalNode {
  table: string;
  source: string;
}

/** A SQL query the page ran (layer 4). */
export interface TraceQueryNode {
  queryFile: string;
  finalTables: string[];
  sources: string[];
}

/** A directed lineage edge between two node ids. */
export interface TraceEdge {
  from: string;
  to: string;
}

export interface PageTrace {
  apiBase: string;
  sources: TraceSourceNode[];
  finalTables: TraceFinalNode[];
  queries: TraceQueryNode[];
  viewLabel: string;
  edges: TraceEdge[];
}

/** Stable node id scheme shared by the view model, layout and renderer. */
export const traceNodeId = {
  api: "api",
  view: "view",
  source: (table: string) => `source:${table}`,
  final: (table: string) => `final:${table}`,
  query: (queryFile: string) => `query:${queryFile}`,
};

function validIso(ts: string | null | undefined): string | null {
  if (!ts) return null;
  if (ts.startsWith("1970-01-01")) return null;
  return ts;
}

/** Deep link to a single source record via the open-data batch API. */
export function recordUrl(
  table: string,
  pkName: string,
  value: string,
): string {
  const params = new URLSearchParams({
    pkName,
    pkStartValue: value,
    perPage: "1",
  });
  return `${API_URL_BASE}/${table}/batch?${params.toString()}`;
}

/** Builds a deep-link record from a captured/probed PK value (+ optional label). */
export function recordLink(
  table: string,
  pkName: string,
  value: string,
  label?: string,
): TraceRecordLink {
  return { value, url: recordUrl(table, pkName, value), label };
}

function sourceNode(
  table: string,
  traceRepo: TraceRepository | null,
): TraceSourceNode {
  const meta = TABLE_META[table];
  const summary = traceRepo?.getSummary(table) ?? null;
  const lastIso = validIso(summary?.lastScrapedAt);
  return {
    table,
    displayName: meta?.displayName ?? table,
    endpoint: meta?.endpoint ?? `GET /api/v1/tables/${table}/batch`,
    apiUrl: `${API_URL_BASE}/${table}/batch`,
    importedRows: summary?.importedRows ?? null,
    lastFetched: lastIso ? formatFiDateTime(lastIso) : null,
    pkName: SOURCE_PK_NAME[table] ?? null,
  };
}

/**
 * Builds the page trace from the query files captured during a render. Dedupes
 * and sorts every layer for deterministic output and tolerates `traceRepo` being
 * null (stats become null, the graph still draws).
 */
export function buildPageTrace(
  queryFiles: Iterable<string>,
  traceRepo: TraceRepository | null,
  viewLabel: string,
): PageTrace {
  const files = [...new Set(queryFiles)].sort();

  const sourceTables = new Set<string>();
  const finalToSource = new Map<string, string>();
  const queries: TraceQueryNode[] = [];
  const edgeKeys = new Set<string>();
  const edges: TraceEdge[] = [];

  const addEdge = (from: string, to: string) => {
    const key = `${from}|${to}`;
    if (edgeKeys.has(key)) return;
    edgeKeys.add(key);
    edges.push({ from, to });
  };

  for (const queryFile of files) {
    const qp = querySourcesFor(queryFile);
    if (!qp) continue;

    const mappedFinals = qp.tables.filter((t) => SOURCE_LINEAGE[t]);
    if (mappedFinals.length === 0) continue;

    for (const source of qp.sources) sourceTables.add(source);

    for (const finalTable of mappedFinals) {
      const source = SOURCE_LINEAGE[finalTable]!.sourceTable;
      finalToSource.set(finalTable, source);
      addEdge(traceNodeId.api, traceNodeId.source(source));
      addEdge(traceNodeId.source(source), traceNodeId.final(finalTable));
      addEdge(traceNodeId.final(finalTable), traceNodeId.query(queryFile));
    }
    addEdge(traceNodeId.query(queryFile), traceNodeId.view);

    queries.push({
      queryFile,
      finalTables: [...mappedFinals].sort(),
      sources: [...qp.sources].sort(),
    });
  }

  const sources = [...sourceTables]
    .sort()
    .map((table) => sourceNode(table, traceRepo));

  const finalTables: TraceFinalNode[] = [...finalToSource.entries()]
    .map(([table, source]) => ({ table, source }))
    .sort((a, b) => a.table.localeCompare(b.table));

  return {
    apiBase: TRACE_API_BASE,
    sources,
    finalTables,
    queries,
    viewLabel,
    edges,
  };
}

/** Whether a trace has any lineage to draw. */
export function traceIsEmpty(trace: PageTrace): boolean {
  return trace.sources.length === 0 || trace.queries.length === 0;
}

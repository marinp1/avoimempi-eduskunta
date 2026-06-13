import { AsyncLocalStorage } from "node:async_hooks";
import type { Database } from "bun:sqlite";
import { SOURCE_LINEAGE } from "#constants/SourceLineage";
import { listQueryFiles } from "./query-audit";
import { getQuerySources } from "./query-provenance";
import { RECORD_LABEL } from "./record-label";

/**
 * Request-scoped capture of which feature SQL files fed a page render, plus the
 * individual source-record primary keys those queries returned — used to build
 * the page-level data trace ("Tietolähteet") overlay.
 *
 * Repositories pass the *exact* imported `.sql` file text to `db.prepare` /
 * `db.query`. We monkey-patch those two methods on the shared connection
 * (see {@link installTraceCapture}) so every executed query that matches a known
 * SQL file registers its basename into the {@link PageTraceCollector} active for
 * the current request (via {@link traceStore}). We also wrap the returned
 * statement's `all`/`get` so result rows can be scanned for source primary keys
 * (row-level deep links). Capture is a no-op when no store is active and can
 * never throw — it must never break a query.
 *
 * `withWebappPage` opens a collector around each render and, afterwards, stores
 * the captured set per-URL ({@link recordPageTrace}). The `/api/trace` route then
 * reads it back ({@link getRecordedTrace}) to render the lineage on demand.
 */

/** Cap on distinct record PKs captured per source table, per render. */
const MAX_PKS_PER_SOURCE = 200;
/** Cap on rows scanned per statement execution (bounds per-request overhead). */
const MAX_ROWS_SCANNED = 400;
/** Cap on entries in the page trace memos (prevents unbounded growth from crawlers). */
const MAX_TRACE_MEMO_ENTRIES = 500;

/** Collects the SQL files, source-record PKs (with optional labels) and bound
 *  params touched during one page render. PK *values* are keyed by source table
 *  (→ optional label); the PK *name* is a per-table constant resolved later from
 *  SOURCE_LINEAGE, so it is not stored here. */
export class PageTraceCollector {
  readonly queryFiles = new Set<string>();
  readonly recordPks = new Map<string, Map<string, string | undefined>>();
  readonly queryParams = new Map<string, Record<string, unknown>>();

  add(queryFile: string): void {
    this.queryFiles.add(queryFile);
  }

  addPk(sourceTable: string, value: string, label?: string): void {
    let values = this.recordPks.get(sourceTable);
    if (!values) {
      values = new Map();
      this.recordPks.set(sourceTable, values);
    }
    if (values.has(value)) {
      if (label && !values.get(value)) values.set(value, label);
    } else if (values.size < MAX_PKS_PER_SOURCE) {
      values.set(value, label);
    }
  }

  /** Records the first non-empty bound-param object seen for a query file. */
  addParams(queryFile: string, params: unknown): void {
    if (!params || typeof params !== "object" || Array.isArray(params)) return;
    const record = params as Record<string, unknown>;
    if (Object.keys(record).length === 0) return;
    if (this.queryParams.has(queryFile)) return;
    this.queryParams.set(queryFile, { ...record });
  }
}

export const traceStore = new AsyncLocalStorage<PageTraceCollector>();

/**
 * Normalizes SQL for content matching: trims and collapses every run of
 * whitespace to a single space. Applied identically when building the reverse
 * map and when looking a query up, so trivial loader/whitespace differences
 * never break a match.
 */
export function normalizeSql(sql: string): string {
  return sql.replace(/\s+/g, " ").trim();
}

let reverseMap: Map<string, string> | null = null;

/** Lazily builds and caches `normalizedSqlText → queryFile basename`. */
export function getSqlReverseMap(): Map<string, string> {
  if (reverseMap) return reverseMap;
  const map = new Map<string, string>();
  for (const { queryFile, sql } of listQueryFiles()) {
    map.set(normalizeSql(sql), queryFile);
  }
  reverseMap = map;
  return map;
}

let querySqlMap: Map<string, string> | null = null;

/** Lazily builds and caches `queryFile basename → raw SQL text`. */
function getQuerySqlMap(): Map<string, string> {
  if (querySqlMap) return querySqlMap;
  const map = new Map<string, string>();
  for (const { queryFile, sql } of listQueryFiles()) {
    map.set(queryFile, sql);
  }
  querySqlMap = map;
  return map;
}

/**
 * Returns the raw SQL text for a known query file basename, or `undefined` for
 * any name not in the feature SQL set. The allowlist lookup doubles as a
 * path-traversal guard: arbitrary paths (e.g. `../secret`) are never matched.
 */
export function getQuerySql(file: string): string | undefined {
  return getQuerySqlMap().get(file);
}

/** A result column that resolves unambiguously to a source record's PK. */
export interface RowPkColumn {
  /** Result column name (equals the final table's `sourcePkColumn`). */
  column: string;
  /** Raw API source table the value belongs to. */
  sourceTable: string;
}

let rowPkColumns: Map<string, RowPkColumn[]> | null = null;

/**
 * Lazily builds `queryFile → row-PK columns`. For each query, maps every final
 * table that is row-level traceable to its `sourcePkColumn`. A column that maps
 * to more than one source within the same query (e.g. the shared `id` column on
 * a join) is dropped as ambiguous, so a captured value is never attributed to
 * the wrong source table.
 */
export function getQueryRowPkColumns(): Map<string, RowPkColumn[]> {
  if (rowPkColumns) return rowPkColumns;
  const map = new Map<string, RowPkColumn[]>();
  for (const [queryFile, prov] of getQuerySources()) {
    const byColumn = new Map<string, RowPkColumn | null>();
    for (const table of prov.tables) {
      const rule = SOURCE_LINEAGE[table];
      if (!rule?.sourcePkName || !rule.sourcePkColumn) continue;
      const entry: RowPkColumn = {
        column: rule.sourcePkColumn,
        sourceTable: rule.sourceTable,
      };
      const existing = byColumn.get(entry.column);
      if (existing === undefined) {
        byColumn.set(entry.column, entry);
      } else if (existing && existing.sourceTable !== entry.sourceTable) {
        byColumn.set(entry.column, null); // ambiguous
      }
    }
    const columns = [...byColumn.values()].filter(
      (c): c is RowPkColumn => c != null,
    );
    if (columns.length) map.set(queryFile, columns);
  }
  rowPkColumns = map;
  return map;
}

/** Resolves the query file for a SQL string and registers it into the store. */
function noteQuery(sql: unknown): string | undefined {
  try {
    const store = traceStore.getStore();
    if (!store || typeof sql !== "string") return undefined;
    const queryFile = getSqlReverseMap().get(normalizeSql(sql));
    if (queryFile) store.add(queryFile);
    return queryFile;
  } catch {
    return undefined;
  }
}

/** Scans result rows for unambiguous source PKs (+ labels) into the collector. */
function scanRows(res: unknown, columns: RowPkColumn[]): void {
  const store = traceStore.getStore();
  if (!store) return;
  const rows = Array.isArray(res)
    ? res
    : res && typeof res === "object"
      ? [res]
      : [];
  const limit = Math.min(rows.length, MAX_ROWS_SCANNED);
  for (let i = 0; i < limit; i++) {
    const row = rows[i] as Record<string, unknown> | null;
    if (!row) continue;
    for (const col of columns) {
      const value = row[col.column];
      if (value == null) continue;
      const label = RECORD_LABEL[col.sourceTable]?.format(row);
      store.addPk(col.sourceTable, String(value), label);
    }
  }
}

/**
 * Wraps a statement's `all`/`get` to (1) record the bound params for the query
 * file and (2) scan results for the query's unambiguous row PKs. Params are
 * captured for every known query (for the SQL detail panel); row scanning runs
 * only for queries that project a traceable PK column.
 */
function instrument(stmt: unknown, queryFile: string): unknown {
  try {
    const s = stmt as Record<string, unknown> & { __traceWrapped?: boolean };
    if (!s || typeof s !== "object" || s.__traceWrapped) return stmt;
    const columns = getQueryRowPkColumns().get(queryFile);
    s.__traceWrapped = true;
    for (const method of ["all", "get"] as const) {
      const orig = s[method];
      if (typeof orig !== "function") continue;
      s[method] = function (this: unknown, ...args: unknown[]) {
        const res = (orig as (...a: unknown[]) => unknown).apply(this, args);
        try {
          const store = traceStore.getStore();
          if (store) {
            if (args.length > 0) store.addParams(queryFile, args[0]);
            if (columns && columns.length > 0) scanRows(res, columns);
          }
        } catch {
          // Capture must never interfere with query execution.
        }
        return res;
      };
    }
  } catch {
    // Leave the statement untouched if it can't be instrumented.
  }
  return stmt;
}

/**
 * Monkey-patches `db.prepare` / `db.query` so each call registers its query file
 * and (for row-level queries) scans results for source PKs into the active
 * collector. Idempotent-safe to call once at connection setup.
 */
export function installTraceCapture(db: Database): void {
  const origQuery = db.query.bind(db);
  const origPrepare = db.prepare.bind(db);
  // The bun:sqlite overloads are generic; the wrappers are pass-through so we
  // erase the signature here and restore it at the call sites.
  (db as unknown as { query: (...a: unknown[]) => unknown }).query = (
    ...args: unknown[]
  ) => {
    const queryFile = noteQuery(args[0]);
    const stmt = (origQuery as (...a: unknown[]) => unknown)(...args);
    return queryFile ? instrument(stmt, queryFile) : stmt;
  };
  (db as unknown as { prepare: (...a: unknown[]) => unknown }).prepare = (
    ...args: unknown[]
  ) => {
    const queryFile = noteQuery(args[0]);
    const stmt = (origPrepare as (...a: unknown[]) => unknown)(...args);
    return queryFile ? instrument(stmt, queryFile) : stmt;
  };
}

/** A single labelled source record captured during a render. */
export interface RecordedRecord {
  value: string;
  label?: string;
}

/** Source-record PKs captured for one source table during a render. */
export interface RecordedPks {
  sourceTable: string;
  records: RecordedRecord[];
}

/** What a single page render touched, keyed by URL in the memo. */
export interface RecordedTrace {
  queryFiles: string[];
  viewLabel: string;
  recordPks: RecordedPks[];
  /** Bound params per query file, for the SQL detail panel + probe replay. */
  queryParams: Record<string, Record<string, unknown>>;
}

/** Exact memo, keyed by `pathname + search`, capped at {@link MAX_TRACE_MEMO_ENTRIES}. */
const pageTraceMemo = new Map<string, RecordedTrace>();
/** Fallback memo, keyed by `pathname` only (last render of that path wins), capped at {@link MAX_TRACE_MEMO_ENTRIES}. */
const pageTracePathMemo = new Map<string, RecordedTrace>();

function setMemoCapped(
  map: Map<string, RecordedTrace>,
  key: string,
  value: RecordedTrace,
): void {
  while (map.size >= MAX_TRACE_MEMO_ENTRIES) {
    const oldestKey = map.keys().next().value;
    if (oldestKey === undefined) break;
    map.delete(oldestKey);
  }
  map.set(key, value);
}

function asUrl(target: string | URL): URL {
  return typeof target === "string" ? new URL(target, "http://x") : target;
}

/** Records what a freshly rendered page used, keyed by URL (and by path). */
export function recordPageTrace(
  target: string | URL,
  collector: PageTraceCollector,
  viewLabel: string,
): void {
  const queryFiles = [...collector.queryFiles];
  if (queryFiles.length === 0) return;
  const recordPks: RecordedPks[] = [...collector.recordPks.entries()].map(
    ([sourceTable, values]) => ({
      sourceTable,
      records: [...values].map(([value, label]) =>
        label != null ? { value, label } : { value },
      ),
    }),
  );
  const queryParams = Object.fromEntries(collector.queryParams);
  const recorded: RecordedTrace = {
    queryFiles,
    viewLabel,
    recordPks,
    queryParams,
  };
  const url = asUrl(target);
  setMemoCapped(pageTraceMemo, `${url.pathname}${url.search}`, recorded);
  setMemoCapped(pageTracePathMemo, url.pathname, recorded);
}

/**
 * Looks up the recorded trace for a path. Tries the exact `pathname + search`
 * first, then falls back to the most recent render of the same `pathname` — so
 * the overlay still resolves when the live URL's query string differs from the
 * one captured at render time (e.g. reordered or lazily-loaded params).
 */
export function getRecordedTrace(target: string): RecordedTrace | undefined {
  try {
    const url = asUrl(target);
    return (
      pageTraceMemo.get(`${url.pathname}${url.search}`) ??
      pageTracePathMemo.get(url.pathname)
    );
  } catch {
    return undefined;
  }
}

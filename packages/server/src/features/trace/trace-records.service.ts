import type { Database } from "bun:sqlite";
import { querySourcesFor } from "#server/database/query-provenance";
import {
  buildProbeQuery,
  probeTargetsFor,
  referencedParamNames,
} from "#server/database/query-trace-probe";
import { RECORD_LABEL } from "#server/database/record-label";
import { getQuerySql } from "#server/database/trace-collector";
import type { RecordedTrace } from "#server/database/trace-collector";

/** Scalar bind value accepted by bun:sqlite's named-params object. */
type ScalarBinding =
  | string
  | bigint
  | NodeJS.TypedArray
  | number
  | boolean
  | null;

/**
 * On-demand provenance resolver for one source table.
 *
 * Recovers the individual records behind a source by (1) taking whatever passive
 * capture recorded during the render and (2) replaying each touching query as a
 * PK-only probe against the live DB (filters + params intact) — see
 * {@link probeTargetsFor} / {@link buildProbeQuery}. Results are unioned and
 * deduped. When a source is used but yields no row-level records (aggregates,
 * existence-only filters), it is reported as `aggregatedOnly` together with the
 * params that filtered the page. Every probe is best-effort: a failure is
 * swallowed so the overlay never breaks.
 */

export interface ResolvedRecord {
  value: string;
  label?: string;
}

export interface ResolvedSource {
  records: ResolvedRecord[];
  params: Record<string, unknown>;
  aggregatedOnly: boolean;
}

function mergeRecord(
  into: Map<string, string | undefined>,
  value: string,
  label: string | undefined,
): void {
  if (into.has(value)) {
    if (label && !into.get(value)) into.set(value, label);
  } else {
    into.set(value, label);
  }
}

const columnsCache = new WeakMap<Database, Map<string, Set<string>>>();

/** Cached column names for a final table (empty set when it can't be read). */
function tableColumns(db: Database, table: string): Set<string> {
  let perDb = columnsCache.get(db);
  if (!perDb) {
    perDb = new Map();
    columnsCache.set(db, perDb);
  }
  const cached = perDb.get(table);
  if (cached) return cached;
  let cols = new Set<string>();
  try {
    const rows = db.query(`PRAGMA table_info(${table})`).all() as {
      name: string;
    }[];
    cols = new Set(rows.map((r) => r.name));
  } catch {
    // Unknown table → no label columns; probe will surface the error itself.
  }
  perDb.set(table, cols);
  return cols;
}

function pickParams(
  params: Record<string, unknown>,
  names: string[],
): Record<string, ScalarBinding> {
  const out: Record<string, ScalarBinding> = {};
  for (const name of names) {
    if (name in params) out[name] = params[name] as ScalarBinding;
  }
  return out;
}

export function resolveSourceRecords(
  db: Database,
  recorded: RecordedTrace,
  table: string,
): ResolvedSource {
  const byValue = new Map<string, string | undefined>();

  for (const rp of recorded.recordPks) {
    if (rp.sourceTable !== table) continue;
    for (const r of rp.records) mergeRecord(byValue, r.value, r.label);
  }

  for (const queryFile of recorded.queryFiles) {
    const targets = probeTargetsFor(queryFile).filter(
      (t) => t.sourceTable === table,
    );
    if (targets.length === 0) continue;
    const sql = getQuerySql(queryFile);
    if (!sql) continue;
    const params = recorded.queryParams[queryFile] ?? {};
    for (const target of targets) {
      try {
        const labelCols = (
          RECORD_LABEL[target.sourceTable]?.columns ?? []
        ).filter((c) => tableColumns(db, target.finalTable).has(c));
        const probe = buildProbeQuery(
          sql,
          { alias: target.alias, pkCol: target.pkCol },
          labelCols,
        );
        if (!probe) continue;
        const bind = pickParams(params, referencedParamNames(probe));
        const stmt = db.prepare<
          Record<string, unknown>,
          Record<string, ScalarBinding>
        >(probe);
        const rows = stmt.all(bind);
        for (const row of rows) {
          const value = row[target.pkCol];
          if (value == null) continue;
          const label = RECORD_LABEL[target.sourceTable]?.format(row);
          mergeRecord(byValue, String(value), label);
        }
      } catch {
        // Best-effort: a broken probe must not break the overlay.
      }
    }
  }

  const records: ResolvedRecord[] = [...byValue]
    .map(([value, label]) => (label != null ? { value, label } : { value }))
    .sort((a, b) =>
      a.value.localeCompare(b.value, undefined, { numeric: true }),
    );

  if (records.length > 0) {
    return { records, params: {}, aggregatedOnly: false };
  }

  const params: Record<string, unknown> = {};
  let touches = false;
  for (const queryFile of recorded.queryFiles) {
    if (querySourcesFor(queryFile)?.sources.includes(table)) {
      touches = true;
      Object.assign(params, recorded.queryParams[queryFile] ?? {});
    }
  }
  return { records: [], params, aggregatedOnly: touches };
}

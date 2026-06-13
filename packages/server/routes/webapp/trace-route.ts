import { defineRoute } from "#server/helpers";
import {
  getQuerySql,
  getRecordedTrace,
} from "#server/database/trace-collector";
import {
  buildPageTrace,
  recordLink,
  traceIsEmpty,
} from "#server/features/trace/trace.view-model";
import type { TraceRecordLink } from "#server/features/trace/trace.view-model";
import { resolveSourceRecords } from "#server/features/trace/trace-records.service";
import TraceOverlay, {
  emptyTraceDetail,
  emptyTraceOverlay,
  traceSourceDetail,
  traceSqlDetail,
} from "#server/components/trace-overlay";
import type { WebappDeps } from "./deps";

const HTML_HEADERS = {
  "Content-Type": "text/html; charset=utf-8",
  "Cache-Control": "no-store",
} as const;

/** Reduces a `for` param to a same-origin path (no host, no scheme). */
function sanitizeForPath(raw: string | null): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw, "http://x");
    return `${url.pathname}${url.search}`;
  } catch {
    return null;
  }
}

/**
 * On-demand page-level data trace ("Tietolähteet").
 *
 * The footer button fetches `/api/trace?for=<current-path>`; we read the query
 * files captured when that page last rendered (memoized per URL by
 * `withWebappPage`) and return the lineage overlay as an HTML fragment to swap
 * into `#trace-overlay-root`. The graph nodes carry `for=<path>` so their
 * detail fetches resolve back to the same recorded render. On a memo miss (e.g.
 * fresh restart) we return a graceful "no trace" overlay rather than an error.
 */
export function createTraceRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/api/trace",
    GET: (req) => {
      const forPath = sanitizeForPath(new URL(req.url).searchParams.get("for"));
      const recorded = forPath ? getRecordedTrace(forPath) : undefined;

      if (!forPath || !recorded) {
        return new Response(emptyTraceOverlay(), { headers: HTML_HEADERS });
      }

      const trace = buildPageTrace(
        recorded.queryFiles,
        deps.traceRepo,
        recorded.viewLabel,
      );
      const body = traceIsEmpty(trace)
        ? emptyTraceOverlay()
        : TraceOverlay({ trace, forPath });
      return new Response(body, { headers: HTML_HEADERS });
    },
  });
}

/**
 * On-demand raw SQL for one query node, rendered as an inline detail fragment
 * swapped into `#trace-detail`. The file is resolved against the feature SQL
 * allowlist (`getQuerySql`, which guards against path traversal); unknown files
 * yield a graceful "unavailable" panel.
 */
export function createTraceSqlRoute(_deps: WebappDeps) {
  return defineRoute({
    path: "/api/trace/sql",
    GET: (req) => {
      const params = new URL(req.url).searchParams;
      const file = params.get("file") ?? "";
      const sql = getQuerySql(file);
      if (!sql) {
        return new Response(emptyTraceDetail(file), { headers: HTML_HEADERS });
      }
      const forPath = sanitizeForPath(params.get("for"));
      const recorded = forPath ? getRecordedTrace(forPath) : undefined;
      const queryParams = recorded?.queryParams[file] ?? {};
      return new Response(traceSqlDetail({ file, sql, params: queryParams }), {
        headers: HTML_HEADERS,
      });
    },
  });
}

/**
 * On-demand detail for one source node (dataset meta + individual record deep
 * links), rendered as an inline detail fragment swapped into `#trace-detail`.
 * Rebuilds the recorded trace for `for` and picks out the requested `table`.
 */
export function createTraceSourceRoute(deps: WebappDeps) {
  return defineRoute({
    path: "/api/trace/source",
    GET: (req) => {
      const params = new URL(req.url).searchParams;
      const forPath = sanitizeForPath(params.get("for"));
      const table = params.get("table") ?? "";
      const recorded = forPath ? getRecordedTrace(forPath) : undefined;

      const source = recorded
        ? buildPageTrace(
            recorded.queryFiles,
            deps.traceRepo,
            recorded.viewLabel,
          ).sources.find((s) => s.table === table)
        : undefined;

      if (!recorded || !source) {
        return new Response(emptyTraceDetail(table), { headers: HTML_HEADERS });
      }

      const resolved = resolveSourceRecords(deps.db, recorded, table);
      const records: TraceRecordLink[] = resolved.records.map((r) =>
        source.pkName
          ? recordLink(table, source.pkName, r.value, r.label)
          : { value: r.value, url: source.apiUrl, label: r.label },
      );
      return new Response(
        traceSourceDetail({
          source,
          records,
          params: resolved.params,
          aggregatedOnly: resolved.aggregatedOnly,
        }),
        { headers: HTML_HEADERS },
      );
    },
  });
}

/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";
import { esc } from "#server/helpers/template-helpers";
import TraceGraph from "./trace-graph";
import type {
  PageTrace,
  TraceRecordLink,
  TraceSourceNode,
} from "#server/features/trace/trace.view-model";
import { layoutTrace } from "#server/features/trace/trace.layout";

/** Overlay shell: scrim + modal dialog. The optional `footer` is rendered as a
 *  sibling of the scroll region (a stable bottom pane), so swapping content into
 *  it never reflows or scrolls the graph above. */
function TraceShell({
  children,
  footer,
}: {
  children: string | (string | null)[];
  footer?: string;
}) {
  return (
    <>
      <div class="trace-scrim" data-trace-scrim hidden></div>
      <aside
        class="trace"
        role="dialog"
        aria-modal="true"
        aria-label={i18next.t("components:trace.title")}
        hidden
      >
        <div class="trace__bar">
          <span class="lbl">{i18next.t("components:trace.title")}</span>
          <button
            class="trace__close"
            type="button"
            data-trace-close
            aria-label={i18next.t("components:trace.close_aria")}
          >
            ×
          </button>
        </div>
        <div class="trace__scroll">{children}</div>
        {footer ?? ""}
      </aside>
    </>
  );
}

function Legend() {
  const items: [string, string][] = [
    ["api", i18next.t("components:trace.layer_api")],
    ["source", i18next.t("components:trace.layer_sources")],
    ["final", i18next.t("components:trace.layer_final")],
    ["query", i18next.t("components:trace.layer_queries")],
    ["view", i18next.t("components:trace.layer_view")],
  ];
  return (
    <div class="trace-legend">
      {items.map(([kind, label]) => (
        <span class={`trace-legend__i trace-legend__i--${kind}`}>
          <span class="dot"></span>
          {esc(label)}
        </span>
      ))}
    </div>
  );
}

/**
 * Full page-trace overlay: the SVG flow graph is the primary surface. Clicking a
 * source or query node loads its details on demand into the inline `#trace-detail`
 * panel below the graph (no separate ledger, no second modal).
 */
export default function TraceOverlay({
  trace,
  forPath,
}: {
  trace: PageTrace;
  forPath: string;
}) {
  const layout = layoutTrace(trace);
  return (
    <TraceShell
      footer={
        <div id="trace-detail" class="trace-detail">
          <p class="trace-detail__hint">
            {esc(i18next.t("components:trace.detail_hint"))}
          </p>
        </div>
      }
    >
      <p class="trace__sub">{esc(i18next.t("components:trace.subtitle"))}</p>
      <Legend />
      <div class="trace-graph-wrap">
        <TraceGraph trace={trace} layout={layout} forPath={forPath} />
      </div>
      {layout.collapsedFinals ? (
        <p class="trace__note">
          {esc(i18next.t("components:trace.fallback_note"))}
        </p>
      ) : null}
    </TraceShell>
  );
}

/** Graceful overlay when no trace was captured for the requested page. */
export function emptyTraceOverlay(): string {
  return (
    <TraceShell>
      <p class="trace__empty">{esc(i18next.t("components:trace.empty"))}</p>
    </TraceShell>
  );
}

/** Max individual record deep links rendered per source (rest summarised). */
const RECORD_RENDER_CAP = 60;

/**
 * Shared inline detail panel rendered into `#trace-detail` when a node is
 * clicked. A consistent head (title + optional action) keeps source and SQL
 * details visually uniform.
 */
function TraceDetail({
  title,
  action,
  children,
}: {
  title: string;
  action?: string;
  children: string | (string | null)[];
}) {
  return (
    <div class="trace-detail__panel">
      <div class="trace-detail__head">
        <span class="trace-detail__title">{esc(title)}</span>
        <span class="trace-detail__actions">
          {action ?? ""}
          <button
            type="button"
            class="trace-detail__close"
            data-trace-detail-close
            aria-label={i18next.t("components:trace.close_aria")}
          >
            ×
          </button>
        </span>
      </div>
      <div class="trace-detail__body">{children}</div>
    </div>
  );
}

/** Renders a value safely for the params list (stringified + truncated). */
function formatParamValue(value: unknown): string {
  if (value === null || value === undefined) return "NULL";
  const text = typeof value === "string" ? value : String(value);
  return text.length > 200 ? `${text.slice(0, 199)}…` : text;
}

/** A `$name = value` list of the params that filtered the page. */
function ParamsList({ params }: { params: Record<string, unknown> }) {
  const entries = Object.entries(params);
  if (entries.length === 0) return "";
  return (
    <div class="trace-params">
      <p class="trace-params__title">
        {esc(i18next.t("components:trace.params_title"))}
      </p>
      <dl class="trace-params__list">
        {entries.map(([name, value]) => (
          <div class="trace-params__row">
            <dt class="trace-params__key">{esc(name)}</dt>
            <dd class="trace-params__val">{esc(formatParamValue(value))}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Inline detail for a source dataset: meta + API link, then either the
 * individual records (resolved on demand) as a table, or — for aggregate /
 * non-row-traceable sources — a note plus the params that filtered the page.
 */
export function traceSourceDetail({
  source,
  records,
  params,
  aggregatedOnly,
}: {
  source: TraceSourceNode;
  records: TraceRecordLink[];
  params: Record<string, unknown>;
  aggregatedOnly: boolean;
}): string {
  const meta = [
    source.importedRows != null
      ? i18next.t("components:trace.rows_imported", {
          count: source.importedRows,
        })
      : null,
    source.lastFetched
      ? i18next.t("components:trace.last_fetched", { when: source.lastFetched })
      : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const shown = records.slice(0, RECORD_RENDER_CAP);
  const rest = records.length - shown.length;
  const idHeader = source.pkName ?? i18next.t("components:trace.record_id_col");
  return (
    <TraceDetail
      title={source.table}
      action={
        <a
          class="trace-detail__api"
          href={source.apiUrl}
          target="_blank"
          rel="noopener"
        >
          {esc(i18next.t("components:trace.open_in_api"))} ↗
        </a>
      }
    >
      <p class="trace-detail__sub">{esc(source.displayName)}</p>
      {meta ? <p class="trace-detail__meta">{esc(meta)}</p> : null}
      <p class="trace-detail__ep">{esc(source.endpoint)}</p>
      {aggregatedOnly ? (
        <>
          <p class="trace-detail__note">
            {esc(i18next.t("components:trace.aggregated_note"))}
          </p>
          <ParamsList params={params} />
        </>
      ) : records.length ? (
        <div class="trace-records">
          <p class="trace-records__title">
            {esc(
              i18next.t("components:trace.records_summary", {
                count: records.length,
              }),
            )}
          </p>
          <table class="trace-records__table">
            <thead>
              <tr>
                <th>{esc(idHeader)}</th>
                <th>{esc(i18next.t("components:trace.record_label_col"))}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr>
                  <td class="trace-records__id">{esc(r.value)}</td>
                  <td class="trace-records__label">
                    {r.label ? esc(r.label) : ""}
                  </td>
                  <td class="trace-records__open">
                    <a href={r.url} target="_blank" rel="noopener">
                      ↗
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rest > 0 ? (
            <p class="trace-records__more">
              {esc(i18next.t("components:trace.records_more", { count: rest }))}
            </p>
          ) : null}
        </div>
      ) : null}
    </TraceDetail>
  );
}

/** Inline detail for a query node: its raw SQL + the params it ran with. */
export function traceSqlDetail({
  file,
  sql,
  params = {},
}: {
  file: string;
  sql: string;
  params?: Record<string, unknown>;
}): string {
  return (
    <TraceDetail title={file}>
      <pre class="trace-detail__code">
        <code>{esc(sql)}</code>
      </pre>
      <ParamsList params={params} />
    </TraceDetail>
  );
}

/** Graceful inline detail when a node's data can't be resolved. */
export function emptyTraceDetail(title: string): string {
  return (
    <TraceDetail title={title}>
      <p class="trace__empty">
        {esc(i18next.t("components:trace.detail_unavailable"))}
      </p>
    </TraceDetail>
  );
}

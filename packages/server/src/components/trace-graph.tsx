/** @jsxImportSource ../../src/jsx */
import i18next from "i18next";
import type {
  PageTrace,
  TraceSourceNode,
} from "#server/features/trace/trace.view-model";
import type {
  LaidOutNode,
  TraceGraphLayout,
} from "#server/features/trace/trace.layout";

function trunc(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

const COLUMN_LABEL_KEYS = [
  "components:trace.layer_api",
  "components:trace.layer_sources",
  "components:trace.layer_final",
  "components:trace.layer_queries",
  "components:trace.layer_view",
] as const;

/** A source dataset node — clickable to load its details into `#trace-detail`. */
function SourceNode({
  n,
  src,
  forPath,
}: {
  n: LaidOutNode;
  src?: TraceSourceNode;
  forPath: string;
}) {
  const table = n.id.replace(/^source:/, "");
  const rows =
    src?.importedRows != null
      ? i18next.t("components:trace.rows_imported", { count: src.importedRows })
      : null;
  const fetched = src?.lastFetched
    ? i18next.t("components:trace.last_fetched", { when: src.lastFetched })
    : null;
  const tip = [
    src?.displayName ?? n.label,
    rows,
    fetched,
    i18next.t("components:trace.view_source"),
  ]
    .filter(Boolean)
    .join("\n");
  const url = `/api/trace/source?for=${encodeURIComponent(forPath)}&table=${encodeURIComponent(table)}`;
  return (
    <a
      class="trace-node trace-node--source"
      data-node-id={n.id}
      tabindex="0"
      role="button"
      hx-get={url}
      hx-target="#trace-detail"
      hx-swap="innerHTML transition:false"
      hx-trigger="click, keyup[key=='Enter']"
    >
      <title>{tip}</title>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" />
      <text class="trace-node__t" x={n.x + 13} y={n.y + 22}>
        {trunc(n.label, 30)}
      </text>
      {rows ? (
        <text class="trace-node__m" x={n.x + 13} y={n.y + 41}>
          {rows}
        </text>
      ) : null}
      {fetched ? (
        <text
          class="trace-node__m trace-node__m--soft"
          x={n.x + 13}
          y={n.y + 57}
        >
          {trunc(fetched, 28)}
        </text>
      ) : null}
    </a>
  );
}

/** A plain rectangular node with one centred label line + full-name tooltip. */
function PlainNode({ n, label }: { n: LaidOutNode; label: string }) {
  return (
    <g class={`trace-node trace-node--${n.kind}`} data-node-id={n.id}>
      <title>{label}</title>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" />
      <text
        class="trace-node__t"
        x={n.x + n.w / 2}
        y={n.y + n.h / 2 + 4}
        text-anchor="middle"
      >
        {trunc(label, 30)}
      </text>
    </g>
  );
}

/** A query node — clickable to load its raw SQL into `#trace-detail`. */
function QueryNode({ n, forPath }: { n: LaidOutNode; forPath: string }) {
  const file = n.id.replace(/^query:/, "");
  const url = `/api/trace/sql?file=${encodeURIComponent(file)}&for=${encodeURIComponent(forPath)}`;
  return (
    <a
      class="trace-node trace-node--query"
      data-node-id={n.id}
      tabindex="0"
      role="button"
      hx-get={url}
      hx-target="#trace-detail"
      hx-swap="innerHTML transition:false"
      hx-trigger="click, keyup[key=='Enter']"
    >
      <title>{i18next.t("components:trace.view_sql")}</title>
      <rect x={n.x} y={n.y} width={n.w} height={n.h} rx="7" />
      <text
        class="trace-node__t"
        x={n.x + n.w / 2}
        y={n.y + n.h / 2 + 4}
        text-anchor="middle"
      >
        {trunc(n.label, 30)}
      </text>
    </a>
  );
}

function nodeLabel(n: LaidOutNode): string {
  if (n.kind === "final-collapsed") {
    return i18next.t("components:trace.collapsed_final", {
      count: n.collapsedCount ?? 0,
    });
  }
  return n.label;
}

/** Server-rendered SVG layered flow graph of a page's data lineage. */
export default function TraceGraph({
  trace,
  layout,
  forPath,
}: {
  trace: PageTrace;
  layout: TraceGraphLayout;
  forPath: string;
}) {
  const srcById = new Map<string, TraceSourceNode>(
    trace.sources.map((s) => [`source:${s.table}`, s]),
  );
  return (
    <svg
      class="trace-svg"
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      width={layout.width}
      height={layout.height}
      role="img"
      aria-label={i18next.t("components:trace.title")}
    >
      <defs>
        <marker
          id="trace-arrow"
          viewBox="0 0 8 8"
          refX="7"
          refY="4"
          markerWidth="6.5"
          markerHeight="6.5"
          orient="auto-start-reverse"
        >
          <path class="trace-arrow-head" d="M0,0 L8,4 L0,8 z" />
        </marker>
      </defs>
      <g class="trace-headers">
        {layout.columns.map((col) => (
          <text
            class="trace-header"
            x={col.cx}
            y={layout.headerY}
            text-anchor="middle"
          >
            {i18next.t(COLUMN_LABEL_KEYS[col.index]!)}
          </text>
        ))}
      </g>
      <g class="trace-edges">
        {layout.edges.map((e) => (
          <path
            class="trace-edge"
            data-from={e.from}
            data-to={e.to}
            d={e.path}
            marker-end="url(#trace-arrow)"
          />
        ))}
      </g>
      <g class="trace-nodes">
        {layout.nodes.map((n) =>
          n.kind === "source" ? (
            <SourceNode n={n} src={srcById.get(n.id)} forPath={forPath} />
          ) : n.kind === "query" ? (
            <QueryNode n={n} forPath={forPath} />
          ) : (
            <PlainNode n={n} label={nodeLabel(n)} />
          ),
        )}
      </g>
    </svg>
  );
}

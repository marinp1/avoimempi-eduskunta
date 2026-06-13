import type { PageTrace, TraceEdge } from "./trace.view-model";
import { traceNodeId } from "./trace.view-model";

/**
 * Deterministic left-to-right layered-DAG layout for the page trace graph.
 *
 * Five columns (api / sources / final tables / queries / view), each with a
 * heading. Within a column nodes are sorted and stacked; each column is
 * vertically centred against the tallest one so the whole graph reads as a
 * balanced flow. Edges are cubic Béziers between node right- and left-midpoints.
 * Pure and stable: the same PageTrace always yields identical geometry.
 *
 * Every table is shown by default (no truncation); passing
 * `collapseFinalTables: true` opts into collapsing the middle column into a
 * single summary node, with source→query lineage routed through it.
 */

export type TraceNodeKind =
  | "api"
  | "source"
  | "final"
  | "final-collapsed"
  | "query"
  | "view";

export interface LaidOutNode {
  id: string;
  kind: TraceNodeKind;
  label: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Number of final tables represented by a collapsed node. */
  collapsedCount?: number;
}

export interface LaidOutEdge {
  from: string;
  to: string;
  path: string;
}

/** A column heading (api / sources / …) positioned above its column. */
export interface TraceColumn {
  /** Index 0–4, used by the renderer to pick the i18n label. */
  index: number;
  /** Horizontal centre of the column. */
  cx: number;
}

export interface TraceGraphLayout {
  width: number;
  height: number;
  headerY: number;
  columns: TraceColumn[];
  nodes: LaidOutNode[];
  edges: LaidOutEdge[];
  collapsedFinals: boolean;
}

const NODE_W = 228;
const NODE_H = 46;
const SRC_H = 66;
const COL_GAP = 74;
const ROW_GAP = 16;
const MARGIN = 26;
const HEADER_H = 34;

interface PreNode {
  id: string;
  kind: TraceNodeKind;
  label: string;
  h: number;
  collapsedCount?: number;
}

function colX(col: number): number {
  return MARGIN + col * (NODE_W + COL_GAP);
}

function columnHeight(nodes: PreNode[]): number {
  if (nodes.length === 0) return 0;
  return nodes.reduce((sum, n) => sum + n.h, 0) + (nodes.length - 1) * ROW_GAP;
}

export interface LayoutOptions {
  /** Force collapse on/off; defaults to auto (collapse past the threshold). */
  collapseFinalTables?: boolean;
}

export function layoutTrace(
  trace: PageTrace,
  opts: LayoutOptions = {},
): TraceGraphLayout {
  const collapse = opts.collapseFinalTables ?? false;

  const columnsPre: PreNode[][] = [
    [{ id: traceNodeId.api, kind: "api", label: trace.apiBase, h: NODE_H }],
    trace.sources.map((s) => ({
      id: traceNodeId.source(s.table),
      kind: "source" as const,
      label: s.table,
      h: SRC_H,
    })),
    collapse
      ? [
          {
            id: traceNodeId.final("__all__"),
            kind: "final-collapsed" as const,
            label: String(trace.finalTables.length),
            h: NODE_H,
            collapsedCount: trace.finalTables.length,
          },
        ]
      : trace.finalTables.map((f) => ({
          id: traceNodeId.final(f.table),
          kind: "final" as const,
          label: f.table,
          h: NODE_H,
        })),
    trace.queries.map((q) => ({
      id: traceNodeId.query(q.queryFile),
      kind: "query" as const,
      label: q.queryFile,
      h: NODE_H,
    })),
    [{ id: traceNodeId.view, kind: "view", label: trace.viewLabel, h: NODE_H }],
  ];

  const contentHeight = Math.max(...columnsPre.map(columnHeight));
  const contentTop = MARGIN + HEADER_H;
  const height = contentTop + contentHeight + MARGIN;
  const width = MARGIN * 2 + 5 * NODE_W + 4 * COL_GAP;

  const nodes: LaidOutNode[] = [];
  const pos = new Map<string, LaidOutNode>();

  columnsPre.forEach((col, colIndex) => {
    let y = contentTop + (contentHeight - columnHeight(col)) / 2;
    for (const n of col) {
      const node: LaidOutNode = {
        id: n.id,
        kind: n.kind,
        label: n.label,
        x: colX(colIndex),
        y,
        w: NODE_W,
        h: n.h,
        collapsedCount: n.collapsedCount,
      };
      nodes.push(node);
      pos.set(n.id, node);
      y += n.h + ROW_GAP;
    }
  });

  const columns: TraceColumn[] = columnsPre.map((_, i) => ({
    index: i,
    cx: colX(i) + NODE_W / 2,
  }));

  const edges = layoutEdges(trace.edges, pos, collapse);

  return {
    width,
    height,
    headerY: MARGIN + 14,
    columns,
    nodes,
    edges,
    collapsedFinals: collapse,
  };
}

function layoutEdges(
  traceEdges: TraceEdge[],
  pos: Map<string, LaidOutNode>,
  collapse: boolean,
): LaidOutEdge[] {
  const collapsedId = traceNodeId.final("__all__");
  const seen = new Set<string>();
  const edges: LaidOutEdge[] = [];

  for (const e of traceEdges) {
    let { from, to } = e;
    if (collapse) {
      if (from.startsWith("final:")) from = collapsedId;
      if (to.startsWith("final:")) to = collapsedId;
    }
    if (from === to) continue;

    const a = pos.get(from);
    const b = pos.get(to);
    if (!a || !b) continue;

    const key = `${from}|${to}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const x1 = a.x + a.w;
    const y1 = a.y + a.h / 2;
    const x2 = b.x;
    const y2 = b.y + b.h / 2;
    const dx = COL_GAP * 0.55;
    edges.push({
      from,
      to,
      path: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`,
    });
  }

  return edges;
}

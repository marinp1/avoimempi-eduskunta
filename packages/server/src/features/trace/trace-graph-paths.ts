/**
 * Pure graph helper for the trace overlay's highlight behaviour.
 *
 * Selecting a node lights only the flow it belongs to — its upstream ancestors
 * and downstream descendants — so the rest of the graph can be dimmed. The
 * lineage graph is fully connected through the shared `api` source and `view`
 * sink, so the traversal must be **directional**: an undirected component would
 * light the whole graph. Kept dependency-free so it is unit-testable and
 * importable by the browser island.
 */

export interface GraphEdge {
  from: string;
  to: string;
}

export interface FlowSubgraph {
  nodes: Set<string>;
  edges: Set<string>;
}

/** Edge key matching the `from|to` convention used on the SVG edge elements. */
export function edgeKey(from: string, to: string): string {
  return `${from}|${to}`;
}

/** Nodes reachable from `start` over `adjacency` (inclusive of `start`). */
function reach(adjacency: Map<string, string[]>, start: string): Set<string> {
  const seen = new Set<string>([start]);
  const stack = [start];
  while (stack.length) {
    const current = stack.pop()!;
    for (const next of adjacency.get(current) ?? []) {
      if (!seen.has(next)) {
        seen.add(next);
        stack.push(next);
      }
    }
  }
  return seen;
}

/**
 * The directional flow through `start`: its ancestors (reachable backward) plus
 * its descendants (reachable forward), and every edge that lies wholly within
 * the upstream set or wholly within the downstream set.
 */
export function flowSubgraph(edges: GraphEdge[], start: string): FlowSubgraph {
  const forward = new Map<string, string[]>();
  const backward = new Map<string, string[]>();
  const link = (map: Map<string, string[]>, a: string, b: string) => {
    const list = map.get(a);
    if (list) list.push(b);
    else map.set(a, [b]);
  };
  for (const e of edges) {
    link(forward, e.from, e.to);
    link(backward, e.to, e.from);
  }

  const up = reach(backward, start);
  const down = reach(forward, start);
  const nodes = new Set<string>([...up, ...down]);

  const edgeSet = new Set<string>();
  for (const e of edges) {
    const upstream = up.has(e.from) && up.has(e.to);
    const downstream = down.has(e.from) && down.has(e.to);
    if (upstream || downstream) edgeSet.add(edgeKey(e.from, e.to));
  }
  return { nodes, edges: edgeSet };
}

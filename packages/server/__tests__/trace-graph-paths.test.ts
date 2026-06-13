/**
 * Contract for the graph highlight helper.
 *
 * Selecting a node lights only the *flow it belongs to* — its upstream ancestors
 * and downstream descendants — and dims everything else. Because the lineage
 * graph is fully connected through the shared `api` source and `view` sink, an
 * undirected component would light the whole graph; `flowSubgraph` must therefore
 * be directional. It's the pure core imported by the overlay island.
 */
import { describe, expect, test } from "bun:test";
import { flowSubgraph } from "../src/features/trace/trace-graph-paths";

const chain = [
  { from: "api", to: "source:S" },
  { from: "source:S", to: "final:F" },
  { from: "final:F", to: "query:q.sql" },
  { from: "query:q.sql", to: "view" },
];

describe("flowSubgraph", () => {
  test("from a query node lights its upstream + downstream path", () => {
    const { nodes, edges } = flowSubgraph(chain, "query:q.sql");
    expect([...nodes].sort()).toEqual([
      "api",
      "final:F",
      "query:q.sql",
      "source:S",
      "view",
    ]);
    expect(edges.size).toBe(4);
    expect(edges.has("final:F|query:q.sql")).toBeTrue();
    expect(edges.has("api|source:S")).toBeTrue();
  });

  test("a sibling query sharing api/view is NOT lit (directional)", () => {
    const shared = [
      { from: "api", to: "source:S" },
      { from: "source:S", to: "final:F" },
      { from: "final:F", to: "query:q1.sql" },
      { from: "final:F", to: "query:q2.sql" },
      { from: "query:q1.sql", to: "view" },
      { from: "query:q2.sql", to: "view" },
    ];
    const { nodes, edges } = flowSubgraph(shared, "query:q1.sql");
    expect(nodes.has("query:q1.sql")).toBeTrue();
    expect(nodes.has("query:q2.sql")).toBeFalse();
    expect(nodes.has("final:F")).toBeTrue();
    expect(nodes.has("view")).toBeTrue();
    // the sibling's edge into the shared view must stay dim
    expect(edges.has("query:q2.sql|view")).toBeFalse();
    expect(edges.has("query:q1.sql|view")).toBeTrue();
  });

  test("from a source node lights its downstream finals/queries + upstream api", () => {
    const { nodes } = flowSubgraph(chain, "source:S");
    expect([...nodes].sort()).toEqual([
      "api",
      "final:F",
      "query:q.sql",
      "source:S",
      "view",
    ]);
  });

  test("an isolated node lights only itself with no edges", () => {
    const { nodes, edges } = flowSubgraph(chain, "lonely");
    expect([...nodes]).toEqual(["lonely"]);
    expect(edges.size).toBe(0);
  });
});

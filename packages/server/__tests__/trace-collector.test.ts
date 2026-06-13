/**
 * Contract for the page-level data-trace capture + lineage builder.
 *
 *  - the SQL reverse map matches the exact `.sql` file text repositories pass to
 *    db.prepare/query (normalized whitespace-insensitively), and capture only
 *    runs inside an active request collector and never throws;
 *  - capture records bound params per query file and, for naturally-projected
 *    PKs, labelled source records;
 *  - buildPageTrace turns a set of query files into deduped, sorted lineage with
 *    correct TABLE_META + edges + source pkName, tolerating a null trace DB;
 *  - layoutTrace is deterministic and (only when forced) collapses the
 *    final-tables column;
 *  - the inline detail renderers (source records table / aggregated note / SQL +
 *    params) escape their content.
 */
import { readFileSync } from "node:fs";
import type { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { listQueryFiles } from "../src/database/query-audit";
import {
  PageTraceCollector,
  getQueryRowPkColumns,
  getQuerySql,
  getRecordedTrace,
  getSqlReverseMap,
  installTraceCapture,
  normalizeSql,
  recordPageTrace,
  traceStore,
} from "../src/database/trace-collector";
import {
  buildPageTrace,
  traceNodeId,
} from "../src/features/trace/trace.view-model";
import type {
  PageTrace,
  TraceRecordLink,
} from "../src/features/trace/trace.view-model";
import { layoutTrace } from "../src/features/trace/trace.layout";
import {
  traceSourceDetail,
  traceSqlDetail,
} from "../src/components/trace-overlay";
import { TABLE_META } from "../src/domain/provenance";
import type {
  TraceRepository,
  TraceSummary,
} from "../src/database/trace.repository";

const sample = listQueryFiles()[0]!;
const sampleSql = readFileSync(sample.filePath, "utf8");

const memberVotesSql = readFileSync(
  listQueryFiles().find((f) => f.queryFile === "voting-member-votes.sql")!
    .filePath,
  "utf8",
);

describe("normalizeSql / reverse map", () => {
  test("collapses whitespace and is idempotent", () => {
    const a = normalizeSql("  SELECT\n  1\t,  2  ");
    expect(a).toBe("SELECT 1 , 2");
    expect(normalizeSql(a)).toBe(a);
  });

  test("reverse map resolves a real SQL file's exact text", () => {
    expect(getSqlReverseMap().get(normalizeSql(sampleSql))).toBe(
      sample.queryFile,
    );
  });
});

describe("installTraceCapture", () => {
  function fakeDb(stmt: unknown = {}) {
    const calls: unknown[] = [];
    const db = {
      prepare: (sql: unknown) => {
        calls.push(["prepare", sql]);
        return stmt;
      },
      query: (sql: unknown) => {
        calls.push(["query", sql]);
        return stmt;
      },
    };
    installTraceCapture(db as unknown as Database);
    return db;
  }

  test("registers a known query file when a collector is active", () => {
    const db = fakeDb();
    const collector = new PageTraceCollector();
    traceStore.run(collector, () => {
      db.prepare(sampleSql);
    });
    expect([...collector.queryFiles]).toEqual([sample.queryFile]);
  });

  test("ignores unknown SQL and never throws without a store", () => {
    const db = fakeDb();
    const collector = new PageTraceCollector();
    traceStore.run(collector, () => {
      db.query("SELECT 1 FROM nowhere_unknown");
    });
    expect(collector.queryFiles.size).toBe(0);
    expect(() => db.prepare(sampleSql)).not.toThrow();
  });

  test("captures bound params per query file (first non-empty wins)", () => {
    const stmt = { all: () => [], get: () => null };
    const db = fakeDb(stmt);
    const collector = new PageTraceCollector();
    traceStore.run(collector, () => {
      const s = db.query(memberVotesSql) as unknown as {
        all: (p?: unknown) => unknown;
      };
      s.all({ $id: 56634 });
      s.all({ $id: 999 });
    });
    expect(collector.queryParams.get("voting-member-votes.sql")).toEqual({
      $id: 56634,
    });
  });
});

describe("row-level PK + label capture", () => {
  test("resolves only unambiguous PK columns per query", () => {
    const cols = getQueryRowPkColumns().get("voting-member-votes.sql") ?? [];
    expect(cols).toContainEqual({
      column: "person_id",
      sourceTable: "MemberOfParliament",
    });
    expect(cols.some((c) => c.column === "id")).toBeFalse();
  });

  test("captures source PKs with a human label from the result row", () => {
    const stmt = {
      all: () => [
        { person_id: 1385, first_name: "Anna", last_name: "Virtanen" },
        { person_id: 42, first_name: "Bo", last_name: "Berg" },
      ],
      get: () => null,
    };
    const db = {
      query: (_sql?: unknown) => stmt,
      prepare: (_sql?: unknown) => stmt,
    };
    installTraceCapture(db as unknown as Database);

    const collector = new PageTraceCollector();
    traceStore.run(collector, () => {
      (db.query(memberVotesSql) as unknown as { all: () => unknown }).all();
    });

    const mp = collector.recordPks.get("MemberOfParliament");
    expect([...(mp?.keys() ?? [])].sort()).toEqual(["1385", "42"]);
    expect(mp?.get("1385")).toBe("Anna Virtanen");
  });
});

describe("buildPageTrace", () => {
  const stubRepo = {
    getSummary: (table: string): TraceSummary => ({
      sourceTable: table,
      importedRows: 42,
      firstScrapedAt: "2026-01-01T00:00:00.000Z",
      lastScrapedAt: "2026-06-06T06:00:00.000Z",
    }),
    getProvenance: () => null,
  } as unknown as TraceRepository;

  test("derives deduped sources + edges + pkName from a voting query", () => {
    const trace = buildPageTrace(["voting-detail.sql"], stubRepo, "Äänestys");

    const aanestys = trace.sources.find((s) => s.table === "SaliDBAanestys");
    expect(aanestys).toBeDefined();
    expect(aanestys!.displayName).toBe(TABLE_META.SaliDBAanestys!.displayName);
    expect(aanestys!.importedRows).toBe(42);
    expect(aanestys!.pkName).toBe("AanestysId");
    expect(aanestys!.apiUrl).toContain("/SaliDBAanestys/batch");

    expect(trace.edges.some((e) => e.to === traceNodeId.view)).toBeTrue();
    expect(
      trace.edges.some(
        (e) =>
          e.from === traceNodeId.api &&
          e.to === traceNodeId.source("SaliDBAanestys"),
      ),
    ).toBeTrue();
  });

  test("tolerates a null trace DB", () => {
    const trace = buildPageTrace(["voting-detail.sql"], null, "Äänestys");
    expect(trace.sources.every((s) => s.importedRows === null)).toBeTrue();
    expect(trace.sources.every((s) => s.lastFetched === null)).toBeTrue();
  });
});

describe("layoutTrace", () => {
  const trace = buildPageTrace(["voting-detail.sql"], null, "Äänestys");

  test("is deterministic", () => {
    const a = layoutTrace(trace);
    const b = layoutTrace(trace);
    expect(b.nodes).toEqual(a.nodes);
    expect(b.edges.map((e) => e.path)).toEqual(a.edges.map((e) => e.path));
  });

  test("never auto-collapses, even with many final tables", () => {
    const manyFinals: PageTrace = {
      apiBase: "x",
      sources: [],
      finalTables: Array.from({ length: 12 }, (_, i) => ({
        table: `Table${i}`,
        source: `Src${i}`,
      })),
      queries: [],
      viewLabel: "View",
      edges: [],
    };
    const layout = layoutTrace(manyFinals);
    expect(layout.collapsedFinals).toBeFalse();
    expect(layout.nodes.filter((n) => n.kind === "final").length).toBe(12);
  });

  test("collapses the final-tables column when forced", () => {
    const collapsed = layoutTrace(trace, { collapseFinalTables: true });
    expect(collapsed.collapsedFinals).toBeTrue();
    expect(
      collapsed.nodes.filter((n) => n.kind === "final-collapsed").length,
    ).toBe(1);
  });
});

describe("recordPageTrace / getRecordedTrace", () => {
  test("resolves by exact path+search and falls back to path-only", () => {
    const collector = new PageTraceCollector();
    collector.add("voting-detail.sql");
    collector.addParams("voting-detail.sql", { $id: 7 });
    recordPageTrace(new URL("http://h/votings?phase=2&q=x"), collector, "T");

    expect(getRecordedTrace("/votings?phase=2&q=x")).toBeDefined();
    // different/reordered query string still resolves via the path fallback
    expect(getRecordedTrace("/votings?q=x&phase=2")).toBeDefined();
    expect(getRecordedTrace("/votings")).toBeDefined();
    // a genuinely different path does not
    expect(getRecordedTrace("/edustajat")).toBeUndefined();
  });
});

describe("getQuerySql", () => {
  test("returns SQL text for a known query file", () => {
    const sql = getQuerySql(sample.queryFile);
    expect(sql).toBeDefined();
    expect(normalizeSql(sql!)).toBe(normalizeSql(sampleSql));
  });

  test("returns undefined for unknown names and traversal attempts", () => {
    expect(getQuerySql("does-not-exist.sql")).toBeUndefined();
    expect(getQuerySql("../trace-collector.ts")).toBeUndefined();
    expect(getQuerySql("")).toBeUndefined();
  });
});

const stubRepo = {
  getSummary: (table: string): TraceSummary => ({
    sourceTable: table,
    importedRows: 42,
    firstScrapedAt: null,
    lastScrapedAt: "2026-06-06T06:00:00.000Z",
  }),
  getProvenance: () => null,
} as unknown as TraceRepository;

function aanestysSource() {
  return buildPageTrace(
    ["voting-detail.sql"],
    stubRepo,
    "Äänestys",
  ).sources.find((s) => s.table === "SaliDBAanestys")!;
}

describe("traceSourceDetail", () => {
  const records: TraceRecordLink[] = [
    {
      value: "56634",
      label: "Valtion talousarvio",
      url:
        "https://avoindata.eduskunta.fi/api/v1/tables/SaliDBAanestys/batch" +
        "?pkName=AanestysId&pkStartValue=56634&perPage=1",
    },
  ];

  test("renders a records table with the pkName header, deep link and label", () => {
    const html = traceSourceDetail({
      source: aanestysSource(),
      records,
      params: {},
      aggregatedOnly: false,
    });
    expect(html).toContain("SaliDBAanestys");
    expect(html).toContain("AanestysId");
    expect(html).toContain("Valtion talousarvio");
    expect(html).toContain(
      "?pkName=AanestysId&amp;pkStartValue=56634&amp;perPage=1",
    );
  });

  test("aggregated-only renders the filter params and no records table", () => {
    const html = traceSourceDetail({
      source: aanestysSource(),
      records: [],
      params: { $id: 56634 },
      aggregatedOnly: true,
    });
    expect(html).toContain("$id");
    expect(html).toContain("56634");
    expect(html).not.toContain("trace-records__table");
  });
});

describe("traceSqlDetail", () => {
  test("renders the filename, HTML-escaped SQL and the populated params", () => {
    const html = traceSqlDetail({
      file: "demo.sql",
      sql: "SELECT a & b FROM t WHERE x < $id",
      params: { $id: 56634 },
    });
    expect(html).toContain("demo.sql");
    expect(html).toContain("SELECT a &amp; b FROM t WHERE x &lt; $id");
    expect(html).toContain("$id");
    expect(html).toContain("56634");
  });

  test("includes a dismiss control for the detail pane", () => {
    const html = traceSqlDetail({ file: "demo.sql", sql: "SELECT 1" });
    expect(html).toContain("data-trace-detail-close");
  });
});

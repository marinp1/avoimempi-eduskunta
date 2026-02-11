import { Database } from "bun:sqlite";
import { performance } from "node:perf_hooks";
import { getDatabasePath } from "../../shared/database";
import * as appQueries from "../database/queries";
import { sanityQueries } from "../database/sanity-queries";

type Row = {
  domain: string;
  name: string;
  explainMs: number;
  plan: string[];
  fullScanOps: number;
  usesTempBtree: boolean;
  ok: boolean;
  error?: string;
};

function buildParams(sql: string): Record<string, unknown> {
  const params: Record<string, unknown> = {};
  const matches = sql.match(/\$[A-Za-z_][A-Za-z0-9_]*/g) ?? [];

  for (const key of new Set(matches)) {
    const name = key.slice(1);
    if (name === "limit") params[key] = 50;
    else if (name === "offset") params[key] = 0;
    else if (name === "threshold") params[key] = 10;
    else if (name === "personId") params[key] = 1000;
    else if (name === "sessionKey") params[key] = "2024/1";
    else if (name === "partyCode") params[key] = "kesk";
    else if (name === "id") params[key] = 100;
    else if (name === "query") params[key] = "%hallitus%";
    else if (name === "q") params[key] = "hallitus";
    else if (name === "type") params[key] = null;
    else if (name === "year") params[key] = null;
    else if (name === "startDate") params[key] = null;
    else if (name === "endDate") params[key] = null;
    else if (name === "date") params[key] = "2024-01-15";
    else params[key] = null;
  }

  return params;
}

function analyzeQuery(
  db: Database,
  domain: string,
  name: string,
  sql: string,
): Row {
  const params = buildParams(sql);

  try {
    const start = performance.now();
    const planRows = db
      .query(`EXPLAIN QUERY PLAN ${sql}`)
      .all(params as any) as Array<{ detail: string }>;
    const end = performance.now();

    const plan = planRows.map((p) => p.detail);
    const fullScanOps = plan.filter(
      (detail) =>
        /SCAN\s+/i.test(detail) && !/USING\s+(COVERING\s+)?INDEX/i.test(detail),
    ).length;
    const usesTempBtree = plan.some((detail) =>
      /USE TEMP B-TREE/i.test(detail),
    );

    return {
      domain,
      name,
      explainMs: Number((end - start).toFixed(3)),
      plan,
      fullScanOps,
      usesTempBtree,
      ok: true,
    };
  } catch (error) {
    return {
      domain,
      name,
      explainMs: -1,
      plan: [],
      fullScanOps: 0,
      usesTempBtree: false,
      ok: false,
      error: String(error),
    };
  }
}

const db = new Database(getDatabasePath(), { create: false, readonly: true });
const results: Row[] = [];

for (const [name, value] of Object.entries(appQueries)) {
  if (typeof value !== "string") continue;
  results.push(analyzeQuery(db, "app", name, value));
}

for (const [name, value] of Object.entries(sanityQueries)) {
  if (typeof value !== "string") continue;
  results.push(analyzeQuery(db, "sanity", name, value));
}

const failed = results.filter((r) => !r.ok);
const ok = results.filter((r) => r.ok);

ok.sort(
  (a, b) =>
    b.fullScanOps - a.fullScanOps ||
    Number(b.usesTempBtree) - Number(a.usesTempBtree),
);

const problematic = ok.filter((r) => r.fullScanOps > 0 || r.usesTempBtree);

const lines: string[] = [];
lines.push("# Query Performance Analysis");
lines.push("");
lines.push(`Analyzed at: ${new Date().toISOString()}`);
lines.push(`Database: ${getDatabasePath()}`);
lines.push(`Total queries analyzed: ${results.length}`);
lines.push(`Successful: ${ok.length}`);
lines.push(`Failed: ${failed.length}`);
lines.push("");
lines.push("## Potentially problematic queries");
lines.push("");
lines.push(
  "Heuristics: query plan contains unindexed table scan and/or temp B-tree usage.",
);
lines.push("");
lines.push(
  "| Domain | Query | Explain (ms) | Full scans | Temp B-tree | Note |",
);
lines.push("|---|---|---:|---:|---:|---|");

for (const row of problematic) {
  const note =
    row.fullScanOps > 0 ? "Plan has scan" : "Sort/group temp structure";
  lines.push(
    `| ${row.domain} | ${row.name} | ${row.explainMs.toFixed(3)} | ${row.fullScanOps} | ${row.usesTempBtree ? "yes" : "no"} | ${note} |`,
  );
}

if (problematic.length === 0) {
  lines.push("| - | - | - | - | - | No issues above threshold |");
}

lines.push("");
lines.push("## Top 20 by scan risk");
lines.push("");
lines.push("| Domain | Query | Explain (ms) | Full scans | Temp B-tree |");
lines.push("|---|---|---:|---:|---:|");
for (const row of ok.slice(0, 20)) {
  lines.push(
    `| ${row.domain} | ${row.name} | ${row.explainMs.toFixed(3)} | ${row.fullScanOps} | ${row.usesTempBtree ? "yes" : "no"} |`,
  );
}

lines.push("");
lines.push("## Failed queries");
lines.push("");
if (failed.length === 0) {
  lines.push("None.");
} else {
  for (const row of failed) {
    lines.push(`- ${row.domain}.${row.name}: ${row.error}`);
  }
}

lines.push("");
lines.push("## Notes");
lines.push("");
lines.push(
  "- Full-scan count is derived from `EXPLAIN QUERY PLAN` detail rows containing `SCAN` without `USING INDEX`.",
);
lines.push(
  "- This report is plan-based and does not execute full queries on data rows.",
);

await Bun.write("QUERY_PERFORMANCE_ANALYSIS.md", `${lines.join("\n")}\n`);

console.log(
  `Wrote QUERY_PERFORMANCE_ANALYSIS.md with ${results.length} query analyses.`,
);
console.log(`Potentially problematic: ${problematic.length}`);
if (failed.length > 0) {
  console.log(`Failed analyses: ${failed.length}`);
}

db.close();

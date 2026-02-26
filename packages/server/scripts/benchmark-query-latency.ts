import { Database } from "bun:sqlite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getDatabasePath } from "../../shared/database";

type CliOptions = {
  iterations: number;
  warmup: number;
  json: boolean;
  includeBroad: boolean;
  scope: "all" | "hotspot";
};

type BenchmarkCase = {
  name: string;
  sql: string;
  bindings: Record<string, number | string | null>;
};

type BenchmarkResult = {
  query: string;
  ok: boolean;
  rows: number;
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  fullScans: number;
  tempBtreeOps: number;
  error: string | null;
};

type SampleValues = {
  asOfDate: string;
  startDate: string;
  endDateExclusive: string;
  sessionKey: string;
  sectionKey: string;
  sessionKeysJson: string;
  personId: number;
  votingId: number;
  rollCallId: number;
  partyCode: string;
  identifier: string;
  idA: string;
  idB: string;
  idC: string;
  governmentName: string | null;
  governmentStartDate: string | null;
};

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseNonNegativeInteger(
  value: string | undefined,
  fallback: number,
): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return fallback;
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string | true>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const idx = arg.indexOf("=");
    if (idx === -1) args.set(arg.slice(2), true);
    else args.set(arg.slice(2, idx), arg.slice(idx + 1));
  }

  const scopeRaw = (args.get("scope") as string | undefined) ?? "all";
  const scope: "all" | "hotspot" = scopeRaw === "hotspot" ? "hotspot" : "all";

  return {
    iterations: parseInteger(args.get("iterations") as string | undefined, 5),
    warmup: parseNonNegativeInteger(
      args.get("warmup") as string | undefined,
      1,
    ),
    json: args.has("json"),
    includeBroad: args.has("include-broad"),
    scope,
  };
}

function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function percentile(sortedValues: number[], ratio: number): number {
  if (sortedValues.length === 0) return 0;
  const idx = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil(sortedValues.length * ratio) - 1),
  );
  return sortedValues[idx];
}

function resolveSamples(db: Database): SampleValues {
  const asOfDate =
    (
      db.query("SELECT MAX(date) AS date FROM Session").get() as {
        date?: string;
      } | null
    )?.date ?? new Date().toISOString().slice(0, 10);
  const startDate = addDays(asOfDate, -365);
  const endDateExclusive = addDays(asOfDate, 1);

  const sessionKey =
    (
      db
        .query("SELECT key FROM Session ORDER BY date DESC, id DESC LIMIT 1")
        .get() as { key?: string } | null
    )?.key ?? "2024/1";

  const sectionKey =
    (
      db
        .query(
          `SELECT section_key
           FROM SectionDocumentLink
           WHERE link_url_fi IS NOT NULL
             AND TRIM(link_url_fi) != ''
           LIMIT 1`,
        )
        .get() as { section_key?: string } | null
    )?.section_key ??
    (
      db
        .query(
          `SELECT key
           FROM Section
           WHERE key IS NOT NULL
             AND TRIM(key) != ''
           ORDER BY id DESC
           LIMIT 1`,
        )
        .get() as { key?: string } | null
    )?.key ??
    "2024/1/1";

  const personId =
    (
      db
        .query("SELECT person_id FROM Representative ORDER BY person_id LIMIT 1")
        .get() as { person_id?: number } | null
    )?.person_id ?? 1000;

  const votingId =
    (
      db.query("SELECT id FROM Voting ORDER BY id DESC LIMIT 1").get() as {
        id?: number;
      } | null
    )?.id ?? 1;

  const rollCallId =
    (
      db.query("SELECT id FROM RollCallReport ORDER BY id DESC LIMIT 1").get() as {
        id?: number;
      } | null
    )?.id ?? 1;

  const partyCode =
    (
      db
        .query(
          `SELECT group_abbreviation
           FROM ParliamentaryGroupMembership
           WHERE group_abbreviation IS NOT NULL
             AND TRIM(group_abbreviation) != ''
           ORDER BY id DESC
           LIMIT 1`,
        )
        .get() as { group_abbreviation?: string } | null
    )?.group_abbreviation ?? "kesk";

  const identifier =
    (
      db
        .query(
          `SELECT document_identifier
           FROM SectionDocumentReference
           WHERE document_identifier IS NOT NULL
             AND TRIM(document_identifier) != ''
           LIMIT 1`,
        )
        .get() as { document_identifier?: string } | null
    )?.document_identifier ?? "HE 1/2024 vp";

  const latestGovernment =
    db.query(
      `SELECT name, start_date
       FROM Government
       ORDER BY start_date DESC
       LIMIT 1`,
    ).get() as { name?: string; start_date?: string } | null;

  return {
    asOfDate,
    startDate,
    endDateExclusive,
    sessionKey,
    sectionKey,
    sessionKeysJson: JSON.stringify([sessionKey]),
    personId,
    votingId,
    rollCallId,
    partyCode,
    identifier,
    idA: identifier,
    idB: identifier.replace(/\s+vp$/i, ""),
    idC: identifier.replace(/\s+/g, ""),
    governmentName: latestGovernment?.name ?? null,
    governmentStartDate: latestGovernment?.start_date ?? null,
  };
}

function buildBindingsForSql(
  sql: string,
  samples: SampleValues,
): Record<string, number | string | null> {
  const defaults: Record<string, number | string | null> = {
    $date: samples.asOfDate,
    $startDate: samples.startDate,
    $endDateExclusive: samples.endDateExclusive,
    $asOfDate: samples.asOfDate,
    $governmentName: samples.governmentName,
    $governmentStartDate: samples.governmentStartDate,
    $sessionKey: samples.sessionKey,
    $sectionKey: samples.sectionKey,
    $sessionKeysJson: samples.sessionKeysJson,
    $personId: samples.personId,
    $id: samples.votingId,
    $rollCallId: samples.rollCallId,
    $partyCode: samples.partyCode,
    $identifier: samples.identifier,
    $idA: samples.idA,
    $idB: samples.idB,
    $idC: samples.idC,
    $query: "hallitus",
    $q: "hallitus",
    $limit: 50,
    $offset: 0,
    $threshold: 10,
    $year: null,
    $type: null,
  };

  const bindings: Record<string, number | string | null> = {};
  const parameters = new Set<string>();
  for (const match of sql.matchAll(/\$[A-Za-z_][A-Za-z0-9_]*/g)) {
    parameters.add(match[0]);
  }

  for (const name of parameters) {
    if (name in defaults) {
      bindings[name] = defaults[name];
      continue;
    }

    if (/json/i.test(name)) bindings[name] = "[]";
    else if (/date/i.test(name)) bindings[name] = samples.asOfDate;
    else if (/(id|count|limit|offset|threshold|number)$/i.test(name))
      bindings[name] = 1;
    else bindings[name] = null;
  }

  return bindings;
}

function loadAllQueryCases(db: Database): BenchmarkCase[] {
  const samples = resolveSamples(db);
  const queriesDir = join(import.meta.dirname, "../database/queries");
  const files = readdirSync(queriesDir)
    .filter((filename) => filename.endsWith(".sql"))
    .sort();

  return files.map((filename) => {
    const sql = readFileSync(join(queriesDir, filename), "utf-8");
    return {
      name: filename.replace(/\.sql$/i, ""),
      sql,
      bindings: buildBindingsForSql(sql, samples),
    };
  });
}

function loadHotspotCases(db: Database, includeBroad: boolean): BenchmarkCase[] {
  const samples = resolveSamples(db);
  const queriesDir = join(import.meta.dirname, "../database/queries");
  const read = (filename: string) =>
    readFileSync(join(queriesDir, filename), "utf-8");

  const cases: BenchmarkCase[] = [
    {
      name: "PARTY_SUMMARY_RECENT",
      sql: read("PARTY_SUMMARY.sql"),
      bindings: {
        $asOfDate: samples.asOfDate,
        $startDate: samples.startDate,
        $endDateExclusive: samples.endDateExclusive,
        $governmentName: samples.governmentName,
        $governmentStartDate: samples.governmentStartDate,
      },
    },
    {
      name: "PARTY_PARTICIPATION_BY_GOVERNMENT_RECENT",
      sql: read("PARTY_PARTICIPATION_BY_GOVERNMENT.sql"),
      bindings: {
        $startDate: samples.startDate,
        $endDateExclusive: samples.endDateExclusive,
      },
    },
    {
      name: "SECTION_DOCUMENT_LINKS",
      sql: read("SECTION_DOCUMENT_LINKS.sql"),
      bindings: {
        $sectionKey: samples.sectionKey,
      },
    },
    {
      name: "DOCUMENT_RELATIONS_BY_IDENTIFIER",
      sql: read("DOCUMENT_RELATIONS_BY_IDENTIFIER.sql"),
      bindings: {
        $idA: samples.idA,
        $idB: samples.idB,
        $idC: samples.idC,
      },
    },
  ];

  if (includeBroad) {
    cases.push({
      name: "PARTY_PARTICIPATION_BY_GOVERNMENT_BROAD",
      sql: read("PARTY_PARTICIPATION_BY_GOVERNMENT.sql"),
      bindings: {
        $startDate: null,
        $endDateExclusive: null,
      },
    });
  }

  return cases;
}

function runCase(
  db: Database,
  item: BenchmarkCase,
  options: CliOptions,
): BenchmarkResult {
  try {
    const stmt = db.prepare(item.sql);

    for (let i = 0; i < options.warmup; i++) {
      stmt.all(item.bindings as any);
    }

    let rowCount = 0;
    const latencies: number[] = [];
    for (let i = 0; i < options.iterations; i++) {
      const start = performance.now();
      const rows = stmt.all(item.bindings as any) as unknown[];
      const end = performance.now();
      rowCount = rows.length;
      latencies.push(end - start);
    }
    stmt.finalize();

    const planRows = db
      .query(`EXPLAIN QUERY PLAN ${item.sql}`)
      .all(item.bindings as any) as Array<{ detail: string }>;
    const plan = planRows.map((row) => row.detail);
    const fullScans = plan.filter(
      (detail) =>
        /SCAN\s+/i.test(detail) && !/USING\s+(COVERING\s+)?INDEX/i.test(detail),
    ).length;
    const tempBtreeOps = plan.filter((detail) =>
      /USE TEMP B-TREE/i.test(detail),
    ).length;

    latencies.sort((a, b) => a - b);
    const avgMs = latencies.reduce((sum, value) => sum + value, 0) / latencies.length;

    return {
      query: item.name,
      ok: true,
      rows: rowCount,
      avgMs: Number(avgMs.toFixed(2)),
      p50Ms: Number(percentile(latencies, 0.5).toFixed(2)),
      p95Ms: Number(percentile(latencies, 0.95).toFixed(2)),
      p99Ms: Number(percentile(latencies, 0.99).toFixed(2)),
      fullScans,
      tempBtreeOps,
      error: null,
    };
  } catch (error) {
    return {
      query: item.name,
      ok: false,
      rows: 0,
      avgMs: 0,
      p50Ms: 0,
      p95Ms: 0,
      p99Ms: 0,
      fullScans: 0,
      tempBtreeOps: 0,
      error: String(error),
    };
  }
}

function printResults(results: BenchmarkResult[], options: CliOptions): void {
  if (options.json) {
    console.log(JSON.stringify(results, null, 2));
    return;
  }

  const ok = results.filter((row) => row.ok);
  const failed = results.filter((row) => !row.ok);
  const ranked = [...ok].sort(
    (a, b) =>
      b.p95Ms - a.p95Ms ||
      b.fullScans - a.fullScans ||
      b.tempBtreeOps - a.tempBtreeOps,
  );

  console.log(`# SQL Benchmark (${options.scope})`);
  console.log(`Database: ${getDatabasePath()}`);
  console.log(`Queries analyzed: ${results.length}`);
  console.log(`Successful: ${ok.length}`);
  console.log(`Failed: ${failed.length}`);
  console.log(`Iterations: ${options.iterations}, Warmup: ${options.warmup}`);
  console.log("");

  console.table(
    ranked.map((row) => ({
      query: row.query,
      rows: row.rows,
      avg_ms: row.avgMs,
      p95_ms: row.p95Ms,
      p99_ms: row.p99Ms,
      full_scans: row.fullScans,
      temp_btree_ops: row.tempBtreeOps,
    })),
  );

  if (failed.length > 0) {
    console.log("");
    console.table(
      failed.map((row) => ({
        query: row.query,
        error: row.error,
      })),
    );
  }
}

const options = parseArgs(Bun.argv.slice(2));
const db = new Database(getDatabasePath(), { create: false, readonly: true });
db.exec("PRAGMA query_only = ON;");
db.exec("PRAGMA temp_store = MEMORY;");

const cases =
  options.scope === "all"
    ? loadAllQueryCases(db)
    : loadHotspotCases(db, options.includeBroad);
const results = cases.map((item) => runCase(db, item, options));
printResults(results, options);

db.close();

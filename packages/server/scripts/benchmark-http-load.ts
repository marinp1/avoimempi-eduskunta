import { Database } from "bun:sqlite";
import { getDatabasePath } from "../../shared/database";

type CliOptions = {
  baseUrl: string;
  durationSec: number;
  concurrency: number;
  timeoutMs: number;
  scenario: "mixed" | "analytics-heavy";
  json: boolean;
};

type SampleValues = {
  sectionKey: string;
  documentIdentifier: string;
  personId: number;
  asOfDate: string;
  rangeStartDate: string;
};

type EndpointTarget = {
  name: string;
  path: string;
  weight: number;
};

type EndpointStats = {
  count: number;
  ok: number;
  failures: number;
  latenciesMs: number[];
};

type AggregateStats = {
  totalRequests: number;
  okResponses: number;
  failedResponses: number;
  requestsPerSecond: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
};

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
}

function parseArgs(argv: string[]): CliOptions {
  const args = new Map<string, string | true>();
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const eq = arg.indexOf("=");
    if (eq === -1) args.set(arg.slice(2), true);
    else args.set(arg.slice(2, eq), arg.slice(eq + 1));
  }

  const scenarioRaw = (args.get("scenario") as string | undefined) ?? "mixed";
  const scenario =
    scenarioRaw === "analytics-heavy" ? "analytics-heavy" : "mixed";

  return {
    baseUrl: (
      (args.get("base-url") as string | undefined) ?? "http://127.0.0.1:3000"
    ).replace(/\/+$/, ""),
    durationSec: parseInteger(
      args.get("duration-sec") as string | undefined,
      20,
    ),
    concurrency: parseInteger(
      args.get("concurrency") as string | undefined,
      16,
    ),
    timeoutMs: parseInteger(
      args.get("timeout-ms") as string | undefined,
      10000,
    ),
    scenario,
    json: args.has("json"),
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

function chooseWeightedTarget(
  targets: EndpointTarget[],
  totalWeight: number,
): EndpointTarget {
  const needle = Math.random() * totalWeight;
  let seen = 0;
  for (const target of targets) {
    seen += target.weight;
    if (needle <= seen) return target;
  }
  return targets[targets.length - 1];
}

function resolveSamplesFromDatabase(): SampleValues {
  const db = new Database(getDatabasePath(), { create: false, readonly: true });
  db.exec("PRAGMA query_only = ON;");

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
    )?.section_key ?? "2024/1/1";

  const documentIdentifier =
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

  const personId =
    (
      db
        .query(
          "SELECT person_id FROM Representative ORDER BY person_id LIMIT 1",
        )
        .get() as { person_id?: number } | null
    )?.person_id ?? 1000;

  const asOfDate =
    (
      db.query("SELECT MAX(date) AS date FROM Session").get() as {
        date?: string;
      } | null
    )?.date ?? new Date().toISOString().slice(0, 10);

  db.close();

  return {
    sectionKey,
    documentIdentifier,
    personId,
    asOfDate,
    rangeStartDate: addDays(asOfDate, -365),
  };
}

function buildTargets(
  samples: SampleValues,
  scenario: CliOptions["scenario"],
): EndpointTarget[] {
  const encodedIdentifier = encodeURIComponent(samples.documentIdentifier);
  const commonTargets: EndpointTarget[] = [
    { name: "health", path: "/api/health", weight: 5 },
    { name: "sessions", path: "/api/sessions?page=1&limit=20", weight: 20 },
    { name: "search", path: "/api/search?q=hallitus&limit=20", weight: 20 },
    {
      name: "votings_search",
      path: "/api/votings/search?q=hallitus",
      weight: 15,
    },
    {
      name: "section_links",
      path: `/api/sections/${samples.sectionKey}/links`,
      weight: 15,
    },
    {
      name: "document_relations",
      path: `/api/documents/${encodedIdentifier}/relations`,
      weight: 15,
    },
    {
      name: "party_participation_recent",
      path:
        `/api/insights/party-participation-by-government` +
        `?startDate=${samples.rangeStartDate}&endDate=${samples.asOfDate}`,
      weight: 10,
    },
  ];

  if (scenario === "mixed") {
    return commonTargets;
  }

  return [
    {
      name: "party_participation_recent",
      path:
        `/api/insights/party-participation-by-government` +
        `?startDate=${samples.rangeStartDate}&endDate=${samples.asOfDate}`,
      weight: 45,
    },
    {
      name: "party_discipline_recent",
      path:
        `/api/analytics/party-discipline` +
        `?startDate=${samples.rangeStartDate}&endDate=${samples.asOfDate}`,
      weight: 20,
    },
    {
      name: "participation_by_government_person",
      path:
        `/api/insights/participation/${samples.personId}/by-government` +
        `?startDate=${samples.rangeStartDate}&endDate=${samples.asOfDate}`,
      weight: 20,
    },
    {
      name: "coalition_opposition_recent",
      path:
        `/api/analytics/coalition-opposition?limit=50` +
        `&startDate=${samples.rangeStartDate}&endDate=${samples.asOfDate}`,
      weight: 15,
    },
  ];
}

function computeAggregate(
  latenciesMs: number[],
  okResponses: number,
  failedResponses: number,
  durationSec: number,
): AggregateStats {
  latenciesMs.sort((a, b) => a - b);
  return {
    totalRequests: latenciesMs.length,
    okResponses,
    failedResponses,
    requestsPerSecond: Number((latenciesMs.length / durationSec).toFixed(2)),
    p50Ms: Number(percentile(latenciesMs, 0.5).toFixed(2)),
    p95Ms: Number(percentile(latenciesMs, 0.95).toFixed(2)),
    p99Ms: Number(percentile(latenciesMs, 0.99).toFixed(2)),
  };
}

function printResults(
  options: CliOptions,
  aggregate: AggregateStats,
  endpointStats: Map<string, EndpointStats>,
): void {
  if (options.json) {
    const endpoints = [...endpointStats.entries()].map(([name, stats]) => {
      const sorted = [...stats.latenciesMs].sort((a, b) => a - b);
      return {
        name,
        count: stats.count,
        ok: stats.ok,
        failures: stats.failures,
        p95Ms: Number(percentile(sorted, 0.95).toFixed(2)),
      };
    });
    console.log(
      JSON.stringify(
        {
          baseUrl: options.baseUrl,
          scenario: options.scenario,
          durationSec: options.durationSec,
          concurrency: options.concurrency,
          aggregate,
          endpoints,
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log("# HTTP Load Benchmark");
  console.log("");
  console.table([
    {
      base_url: options.baseUrl,
      scenario: options.scenario,
      duration_sec: options.durationSec,
      concurrency: options.concurrency,
      timeout_ms: options.timeoutMs,
      total_requests: aggregate.totalRequests,
      ok_responses: aggregate.okResponses,
      failed_responses: aggregate.failedResponses,
      req_per_sec: aggregate.requestsPerSecond,
      p50_ms: aggregate.p50Ms,
      p95_ms: aggregate.p95Ms,
      p99_ms: aggregate.p99Ms,
    },
  ]);

  const endpointRows = [...endpointStats.entries()]
    .map(([name, stats]) => {
      const sorted = [...stats.latenciesMs].sort((a, b) => a - b);
      return {
        endpoint: name,
        requests: stats.count,
        ok: stats.ok,
        failures: stats.failures,
        p50_ms: Number(percentile(sorted, 0.5).toFixed(2)),
        p95_ms: Number(percentile(sorted, 0.95).toFixed(2)),
        p99_ms: Number(percentile(sorted, 0.99).toFixed(2)),
      };
    })
    .sort((a, b) => b.p95_ms - a.p95_ms);

  console.table(endpointRows);
}

async function main() {
  const options = parseArgs(Bun.argv.slice(2));
  const samples = resolveSamplesFromDatabase();
  const targets = buildTargets(samples, options.scenario);
  const totalWeight = targets.reduce((sum, target) => sum + target.weight, 0);

  const healthController = new AbortController();
  const healthTimeout = setTimeout(() => healthController.abort(), 3000);
  try {
    const health = await fetch(`${options.baseUrl}/api/health`, {
      signal: healthController.signal,
    });
    if (!health.ok) {
      throw new Error(`/api/health responded with status ${health.status}`);
    }
  } catch (error) {
    throw new Error(
      `Server precheck failed for ${options.baseUrl}/api/health: ${String(error)}`,
    );
  } finally {
    clearTimeout(healthTimeout);
  }

  const endpointStats = new Map<string, EndpointStats>();
  for (const target of targets) {
    endpointStats.set(target.name, {
      count: 0,
      ok: 0,
      failures: 0,
      latenciesMs: [],
    });
  }

  const allLatenciesMs: number[] = [];
  let okResponses = 0;
  let failedResponses = 0;
  const endTime = performance.now() + options.durationSec * 1000;

  const workers = Array.from({ length: options.concurrency }, async () => {
    while (performance.now() < endTime) {
      const target = chooseWeightedTarget(targets, totalWeight);
      const stats = endpointStats.get(target.name);
      if (!stats) continue;

      const startedAt = performance.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), options.timeoutMs);
      let failed = false;

      try {
        const response = await fetch(`${options.baseUrl}${target.path}`, {
          signal: controller.signal,
        });
        await response.arrayBuffer();
        if (response.ok) {
          okResponses += 1;
          stats.ok += 1;
        } else {
          failed = true;
        }
      } catch {
        failed = true;
      } finally {
        clearTimeout(timeout);
      }

      const elapsedMs = performance.now() - startedAt;
      stats.count += 1;
      stats.latenciesMs.push(elapsedMs);
      allLatenciesMs.push(elapsedMs);

      if (failed) {
        failedResponses += 1;
        stats.failures += 1;
      }
    }
  });

  await Promise.all(workers);
  const aggregate = computeAggregate(
    allLatenciesMs,
    okResponses,
    failedResponses,
    options.durationSec,
  );
  if (aggregate.okResponses === 0) {
    throw new Error(
      "No successful HTTP responses recorded during benchmark; aborting result output.",
    );
  }
  printResults(options, aggregate, endpointStats);
}

await main();

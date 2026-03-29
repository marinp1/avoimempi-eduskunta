// Stress-test utility for avoimempi-eduskunta
// Usage: bun run tools/stress-test.ts [--url http://localhost:3000] [--concurrency 10] [--duration 30] [--ramp 5]

const ENDPOINTS = [
  "/api/health",
  "/api/ready",
  "/api/version",
  "/api/home/overview",
  "/api/sessions",
  "/api/session-dates",
  "/api/votings/recent",
  "/api/votings/overview",
  "/api/parties/summary",
  "/api/hallitukset",
  "/api/insights/gender-division",
  "/api/insights/age-division",
  "/api/analytics/close-votes",
  "/api/analytics/recent-activity",
  "/",
];

const MAX_SAMPLES = 100_000;

interface EndpointStats {
  path: string;
  hits: number;
  ok: number;
  fail: number;
  latencies: Float64Array;
  latencyCount: number;
}

interface SharedState {
  running: boolean;
  inFlight: number;
  startedAt: number;
  endpointStats: EndpointStats[];
  activeWorkers: number;
}

function parseArgs() {
  const args = process.argv.slice(2);
  let url = "https://eduskuntapeili.eu";
  let concurrency = 10;
  let duration = 30;
  let ramp = 5;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url" && args[i + 1]) url = args[++i];
    else if (args[i] === "--concurrency" && args[i + 1]) concurrency = parseInt(args[++i], 10);
    else if (args[i] === "--duration" && args[i + 1]) duration = parseInt(args[++i], 10);
    else if (args[i] === "--ramp" && args[i + 1]) ramp = parseInt(args[++i], 10);
  }

  return { url, concurrency, duration, ramp };
}

function percentile(stats: EndpointStats, p: number): number {
  if (stats.latencyCount === 0) return 0;
  const slice = stats.latencies.slice(0, stats.latencyCount).sort();
  const idx = Math.max(0, Math.ceil((p / 100) * slice.length) - 1);
  return slice[idx];
}

function mean(stats: EndpointStats): number {
  if (stats.latencyCount === 0) return 0;
  let sum = 0;
  for (let i = 0; i < stats.latencyCount; i++) sum += stats.latencies[i];
  return sum / stats.latencyCount;
}

function formatMs(n: number): string {
  if (n === 0) return "   -  ";
  if (n >= 1000) return `${(n / 1000).toFixed(1)}s  `;
  return `${n.toFixed(1)}ms`;
}

function pad(s: string, len: number, right = false): string {
  const str = String(s);
  if (str.length >= len) return str.slice(0, len);
  const spaces = " ".repeat(len - str.length);
  return right ? spaces + str : str + spaces;
}

const C = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  clear: "\x1b[2J\x1b[H",
};

function renderTable(state: SharedState, args: ReturnType<typeof parseArgs>): string {
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const remaining = Math.max(0, args.duration - elapsed);

  const totalHits = state.endpointStats.reduce((s, e) => s + e.hits, 0);
  const totalOk = state.endpointStats.reduce((s, e) => s + e.ok, 0);
  const totalFail = state.endpointStats.reduce((s, e) => s + e.fail, 0);
  const rps = elapsed > 0 ? (totalHits / elapsed).toFixed(1) : "0.0";

  const lines: string[] = [];

  lines.push(`${C.bold}${C.cyan}Avoimempi Eduskunta — Stress Test${C.reset}`);
  lines.push(`${C.dim}${args.url}  concurrency=${args.concurrency}  duration=${args.duration}s${C.reset}`);
  lines.push("");

  const okColor = totalFail > 0 ? C.yellow : C.green;
  lines.push(
    `  ${C.bold}elapsed${C.reset}  ${elapsed.toFixed(1).padStart(6)}s   ` +
      `${C.bold}remaining${C.reset}  ${remaining.toFixed(1).padStart(6)}s   ` +
      `${C.bold}in-flight${C.reset}  ${String(state.inFlight).padStart(4)}`
  );
  lines.push(
    `  ${C.bold}rps${C.reset}      ${String(rps).padStart(7)}    ` +
      `${C.bold}total${C.reset}      ${String(totalHits).padStart(7)}    ` +
      `${okColor}${C.bold}ok${C.reset}  ${String(totalOk).padStart(6)}  ` +
      `${C.red}${C.bold}fail${C.reset}  ${String(totalFail).padStart(5)}`
  );
  lines.push("");

  const header =
    `  ${C.bold}` +
    pad("endpoint", 34) +
    pad("hits", 7, true) +
    pad("ok", 7, true) +
    pad("fail", 6, true) +
    pad("mean", 9, true) +
    pad("p95", 9, true) +
    pad("p99", 9, true) +
    `${C.reset}`;
  lines.push(header);
  lines.push("  " + "─".repeat(81));

  const sorted = [...state.endpointStats].sort((a, b) => b.hits - a.hits);

  for (const ep of sorted) {
    const failColor = ep.fail > 0 ? C.red : C.dim;
    const p95 = percentile(ep, 95);
    const p99 = percentile(ep, 99);
    const latencyColor = p95 > 500 ? C.red : p95 > 200 ? C.yellow : C.green;

    lines.push(
      `  ${C.dim}${pad(ep.path, 34)}${C.reset}` +
        `${pad(String(ep.hits), 7, true)}` +
        `  ${C.green}${pad(String(ep.ok), 5, true)}${C.reset}` +
        `  ${failColor}${pad(String(ep.fail), 4, true)}${C.reset}` +
        `  ${latencyColor}${pad(formatMs(mean(ep)), 8, true)}${C.reset}` +
        `  ${latencyColor}${pad(formatMs(p95), 8, true)}${C.reset}` +
        `  ${latencyColor}${pad(formatMs(p99), 8, true)}${C.reset}`
    );
  }

  return lines.join("\n");
}

async function runWorker(
  workerIndex: number,
  state: SharedState,
  args: ReturnType<typeof parseArgs>
): Promise<void> {
  const endpoints = state.endpointStats;
  const n = endpoints.length;

  while (state.running) {
    // Ramp-up: stagger workers so they don't all start simultaneously
    if (args.ramp > 0) {
      const rampDelay = (workerIndex / args.concurrency) * args.ramp * 1000;
      const elapsed = Date.now() - state.startedAt;
      if (elapsed < rampDelay) {
        await new Promise((r) => setTimeout(r, rampDelay - elapsed));
        continue;
      }
    }

    const ep = endpoints[Math.floor(Math.random() * n)];
    const url = args.url + ep.path;

    const t0 = performance.now();
    state.inFlight++;
    ep.hits++;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      const latency = performance.now() - t0;

      if (ep.latencyCount < MAX_SAMPLES) {
        ep.latencies[ep.latencyCount++] = latency;
      }

      if (res.ok) ep.ok++;
      else ep.fail++;
    } catch {
      ep.fail++;
    } finally {
      state.inFlight--;
    }
  }

  state.activeWorkers--;
}

function printFinalSummary(state: SharedState): void {
  const elapsed = (Date.now() - state.startedAt) / 1000;
  const totalHits = state.endpointStats.reduce((s, e) => s + e.hits, 0);
  const totalOk = state.endpointStats.reduce((s, e) => s + e.ok, 0);
  const totalFail = state.endpointStats.reduce((s, e) => s + e.fail, 0);
  const rps = (totalHits / elapsed).toFixed(1);

  // All latencies merged for global percentiles
  const globalStats: EndpointStats = {
    path: "overall",
    hits: totalHits,
    ok: totalOk,
    fail: totalFail,
    latencies: new Float64Array(MAX_SAMPLES),
    latencyCount: 0,
  };
  for (const ep of state.endpointStats) {
    for (let i = 0; i < ep.latencyCount; i++) {
      if (globalStats.latencyCount < MAX_SAMPLES) {
        globalStats.latencies[globalStats.latencyCount++] = ep.latencies[i];
      }
    }
  }

  const p50 = percentile(globalStats, 50);
  const p95 = percentile(globalStats, 95);
  const p99 = percentile(globalStats, 99);
  const avgMs = mean(globalStats);

  console.log(`\n${C.bold}${C.cyan}═══ Final Summary ═══${C.reset}`);
  console.log(`  duration   ${elapsed.toFixed(1)}s`);
  console.log(`  requests   ${totalHits}  (${rps} req/s)`);
  console.log(`  ${C.green}success    ${totalOk}${C.reset}  ${C.red}failed    ${totalFail}${C.reset}`);
  console.log(`  latency    mean=${formatMs(avgMs).trim()}  p50=${formatMs(p50).trim()}  p95=${formatMs(p95).trim()}  p99=${formatMs(p99).trim()}`);

  if (totalFail > 0) {
    console.log(`\n  ${C.bold}Failures by endpoint:${C.reset}`);
    for (const ep of state.endpointStats.filter((e) => e.fail > 0)) {
      console.log(`    ${ep.path.padEnd(38)} ${C.red}${ep.fail} failed${C.reset}`);
    }
  }
  console.log();
}

async function main() {
  const args = parseArgs();

  const endpointStats: EndpointStats[] = ENDPOINTS.map((path) => ({
    path,
    hits: 0,
    ok: 0,
    fail: 0,
    latencies: new Float64Array(MAX_SAMPLES),
    latencyCount: 0,
  }));

  const state: SharedState = {
    running: true,
    inFlight: 0,
    startedAt: Date.now(),
    endpointStats,
    activeWorkers: args.concurrency,
  };

  process.stdout.write(C.clear);
  console.log(`${C.bold}Starting stress test against ${args.url}${C.reset}`);
  console.log(`  concurrency=${args.concurrency}  duration=${args.duration}s  ramp=${args.ramp}s\n`);

  const workers = Array.from({ length: args.concurrency }, (_, i) =>
    runWorker(i, state, args)
  );

  const displayInterval = setInterval(() => {
    process.stdout.write(C.clear);
    process.stdout.write(renderTable(state, args) + "\n");
  }, 500);

  await new Promise<void>((resolve) => setTimeout(resolve, args.duration * 1000));

  state.running = false;
  clearInterval(displayInterval);

  // Wait for in-flight requests to settle (up to 5s)
  const drainDeadline = Date.now() + 5000;
  while (state.inFlight > 0 && Date.now() < drainDeadline) {
    await new Promise((r) => setTimeout(r, 50));
  }

  await Promise.allSettled(workers);

  process.stdout.write(C.clear);
  process.stdout.write(renderTable(state, args) + "\n");
  printFinalSummary(state);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});

import { TableNames } from "#constants";
import { getExactTableCountsByRows } from "#table-counts";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  pkName?: string;
  maxGapIds: number;
  concurrency: number;
  timeoutMs: number;
  skipGapProbe: boolean;
  json: boolean;
}

interface MissingRange {
  start: number;
  end: number;
  count: number;
}

interface ApiBatchResponse {
  columnNames?: string[];
  pkName?: string;
  pkStartValue?: number | null;
  pkEndValue?: number | null;
  pkLastValue?: number | null;
  rowData?: any[][];
  rowCount?: number;
}

interface GapProbeResult {
  id: number;
  foundExact: boolean;
  rowCount: number;
  returnedPk: number | null;
  error?: string;
}

function parseArgs(argv: string[]): Args {
  let table = "";
  let stage: Stage = "raw";
  let pkName: string | undefined;
  let maxGapIds = 500;
  let concurrency = 8;
  let timeoutMs = 10_000;
  let skipGapProbe = false;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--table" && argv[i + 1]) {
      table = argv[++i];
      continue;
    }
    if (arg === "--stage" && argv[i + 1]) {
      const value = argv[++i];
      if (value === "raw" || value === "parsed") {
        stage = value;
      } else {
        throw new Error(`Invalid --stage value: ${value}`);
      }
      continue;
    }
    if (arg === "--pk-name" && argv[i + 1]) {
      pkName = argv[++i];
      continue;
    }
    if ((arg === "--max-gap-ids" || arg === "--max-ids") && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid ${arg} value: ${argv[i]}`);
      }
      maxGapIds = value;
      continue;
    }
    if (arg === "--concurrency" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --concurrency value: ${argv[i]}`);
      }
      concurrency = value;
      continue;
    }
    if (arg === "--timeout-ms" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --timeout-ms value: ${argv[i]}`);
      }
      timeoutMs = value;
      continue;
    }
    if (arg === "--skip-gap-probe" || arg === "--no-verify-api") {
      skipGapProbe = true;
      continue;
    }
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }
    if (!arg.startsWith("-") && !table) {
      table = arg;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!table) {
    throw new Error(
      "Missing required table name. Pass <TableName> or --table <TableName>.",
    );
  }

  return {
    table,
    stage,
    pkName,
    maxGapIds,
    concurrency,
    timeoutMs,
    skipGapProbe,
    json,
  };
}

function printHelpAndExit(): never {
  console.log(`
Check local DB coverage against Eduskunta API:
  1) detect local PK gaps
  2) verify selected gap IDs against API
  3) detect if API has new PKs after local max
  4) compare local row count vs API table count

Usage:
  bun run scripts/check-table-coverage-vs-api.ts <TableName> [options]

Options:
  --table <name>         Table name (alternative to positional argument)
  --stage <raw|parsed>   Local stage to inspect (default: raw)
  --pk-name <name>       PK column name (defaults to API table metadata)
  --max-gap-ids <n>      Max missing IDs to probe from gaps (default: 500)
  --max-ids <n>          Alias for --max-gap-ids
  --concurrency <n>      Concurrent API probes (default: 8)
  --timeout-ms <n>       Per-request timeout in ms (default: 10000)
  --skip-gap-probe       Skip per-ID gap verification calls to API
  --json                 Print machine-readable JSON output
  --help, -h             Show help

Examples:
  bun run scripts/check-table-coverage-vs-api.ts VaskiData
  bun run scripts/check-table-coverage-vs-api.ts SaliDBAanestys --stage parsed
  bun run scripts/check-table-coverage-vs-api.ts VaskiData --max-gap-ids 200 --json
`);
  process.exit(0);
}

function toNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function collectMissingRanges(sortedIds: number[]): MissingRange[] {
  const ranges: MissingRange[] = [];
  if (sortedIds.length < 2) return ranges;

  for (let i = 1; i < sortedIds.length; i++) {
    const prev = sortedIds[i - 1];
    const current = sortedIds[i];
    if (current - prev <= 1) continue;
    const start = prev + 1;
    const end = current - 1;
    ranges.push({ start, end, count: end - start + 1 });
  }
  return ranges;
}

function expandMissingIds(ranges: MissingRange[], maxIds: number): number[] {
  if (maxIds <= 0) return [];

  const ids: number[] = [];
  for (const range of ranges) {
    for (let id = range.start; id <= range.end; id++) {
      ids.push(id);
      if (ids.length >= maxIds) return ids;
    }
  }
  return ids;
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  workerFn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from(
    { length: Math.min(limit, items.length) },
    async () => {
      while (true) {
        const current = index++;
        if (current >= items.length) break;
        results[current] = await workerFn(items[current]);
      }
    },
  );

  await Promise.all(workers);
  return results;
}

async function fetchApiPkName(table: string, timeoutMs: number): Promise<string> {
  const url = `https://avoindata.eduskunta.fi/api/v1/tables/${table}/columns`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!resp.ok) {
    throw new Error(
      `Could not resolve PK name from API for table ${table}: HTTP ${resp.status}`,
    );
  }
  const data = (await resp.json()) as { pkName?: string };
  if (!data.pkName) {
    throw new Error(
      `Could not resolve PK name from API for table ${table}: missing pkName`,
    );
  }
  return data.pkName;
}

async function fetchApiCount(
  table: string,
): Promise<{ apiRowCount: number | null; tablesInEndpoint: number }> {
  const data = await getExactTableCountsByRows({ tableName: table });
  const target = data[0];
  return {
    apiRowCount: typeof target?.rowCount === "number" ? target.rowCount : null,
    tablesInEndpoint: TableNames.length,
  };
}

async function checkGapIdFromApi(
  table: string,
  pkName: string,
  id: number,
  timeoutMs: number,
): Promise<GapProbeResult> {
  const url = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${table}/batch`,
  );
  url.searchParams.set("pkName", pkName);
  url.searchParams.set("pkStartValue", String(id));
  url.searchParams.set("perPage", "1");

  try {
    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      return {
        id,
        foundExact: false,
        rowCount: 0,
        returnedPk: null,
        error: `HTTP ${resp.status}`,
      };
    }

    const data = (await resp.json()) as ApiBatchResponse;
    const rowCount =
      typeof data.rowCount === "number" && Number.isFinite(data.rowCount)
        ? data.rowCount
        : 0;
    const rowData = Array.isArray(data.rowData) ? data.rowData : [];
    const columnNames = Array.isArray(data.columnNames) ? data.columnNames : [];

    if (rowCount < 1 || rowData.length < 1) {
      return {
        id,
        foundExact: false,
        rowCount,
        returnedPk: null,
      };
    }

    const pkIndex = columnNames.indexOf(pkName);
    const returnedPk =
      pkIndex >= 0 ? toNumericId(rowData[0]?.[pkIndex]) : null;
    const responseStart =
      typeof data.pkStartValue === "number" ? data.pkStartValue : id;
    const responseEnd =
      typeof data.pkEndValue === "number"
        ? data.pkEndValue
        : typeof data.pkLastValue === "number"
          ? data.pkLastValue
          : returnedPk;
    const foundExact = returnedPk === id || (responseStart === id && responseEnd === id);

    return {
      id,
      foundExact,
      rowCount,
      returnedPk,
    };
  } catch (error) {
    return {
      id,
      foundExact: false,
      rowCount: 0,
      returnedPk: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function probeTailFromApi(
  table: string,
  pkName: string,
  nextId: number,
  timeoutMs: number,
): Promise<{
  hasRow: boolean;
  returnedPk: number | null;
  rowCount: number;
  error?: string;
}> {
  const url = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${table}/batch`,
  );
  url.searchParams.set("pkName", pkName);
  url.searchParams.set("pkStartValue", String(nextId));
  url.searchParams.set("perPage", "1");

  try {
    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      return {
        hasRow: false,
        returnedPk: null,
        rowCount: 0,
        error: `HTTP ${resp.status}`,
      };
    }

    const data = (await resp.json()) as ApiBatchResponse;
    const rowCount =
      typeof data.rowCount === "number" && Number.isFinite(data.rowCount)
        ? data.rowCount
        : 0;
    const rowData = Array.isArray(data.rowData) ? data.rowData : [];
    const columnNames = Array.isArray(data.columnNames) ? data.columnNames : [];

    if (rowCount < 1 || rowData.length < 1) {
      return { hasRow: false, returnedPk: null, rowCount };
    }

    const pkIndex = columnNames.indexOf(pkName);
    const returnedPk =
      pkIndex >= 0 ? toNumericId(rowData[0]?.[pkIndex]) : null;

    return {
      hasRow: true,
      returnedPk,
      rowCount,
    };
  } catch (error) {
    return {
      hasRow: false,
      returnedPk: null,
      rowCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const { getRawRowStore, getParsedRowStore } = await import(
    "../packages/shared/storage/row-store/factory.ts"
  );
  const rowStore = args.stage === "raw" ? getRawRowStore() : getParsedRowStore();

  const [apiCount, resolvedPkName] = await Promise.all([
    fetchApiCount(args.table),
    args.pkName
      ? Promise.resolve(args.pkName)
      : fetchApiPkName(args.table, args.timeoutMs),
  ]);

  console.log(`Reading ${args.stage}/${args.table} from row store...`);
  const uniqueIds = new Set<number>();
  let rowsScanned = 0;
  for await (const row of rowStore.list(args.table)) {
    uniqueIds.add(row.pk);
    rowsScanned++;
  }

  if (rowsScanned === 0) {
    throw new Error(`No rows found for table: ${args.table} (stage: ${args.stage})`);
  }

  const sortedIds = Array.from(uniqueIds).sort((a, b) => a - b);
  const minId = sortedIds[0] ?? null;
  const maxId = sortedIds[sortedIds.length - 1] ?? null;
  const missingRanges = collectMissingRanges(sortedIds);
  const missingIdsTotal = missingRanges.reduce((sum, range) => sum + range.count, 0);
  const gapIdsToProbe = expandMissingIds(missingRanges, args.maxGapIds);

  const gapProbes: GapProbeResult[] =
    args.skipGapProbe || gapIdsToProbe.length === 0
      ? []
      : await runWithConcurrency(gapIdsToProbe, args.concurrency, (id) =>
          checkGapIdFromApi(args.table, resolvedPkName, id, args.timeoutMs),
        );

  const gapProbeFoundInApi = gapProbes.filter((item) => item.foundExact);
  const gapProbeErrors = gapProbes.filter((item) => !!item.error);
  const gapProbeMissingInApi = gapProbes.filter(
    (item) => !item.foundExact && !item.error,
  );

  const tailProbe =
    maxId === null
      ? null
      : await probeTailFromApi(args.table, resolvedPkName, maxId + 1, args.timeoutMs);

  const apiMinusLocalRows =
    apiCount.apiRowCount === null ? null : apiCount.apiRowCount - rowsScanned;
  const likelyHasNewPks =
    !!tailProbe?.hasRow || (apiMinusLocalRows !== null && apiMinusLocalRows > 0);

  const result = {
    table: args.table,
    stage: args.stage,
    pkName: resolvedPkName,
    local: {
      rowsScanned,
      uniqueIds: uniqueIds.size,
      minId,
      maxId,
      missingRangesCount: missingRanges.length,
      missingIdsTotal,
      missingRanges,
    },
    api: {
      rowCount: apiCount.apiRowCount,
      tablesInCountsEndpoint: apiCount.tablesInEndpoint,
    },
    tailProbe:
      maxId === null
        ? null
        : {
            startAtId: maxId + 1,
            hasRow: tailProbe?.hasRow ?? false,
            returnedPk: tailProbe?.returnedPk ?? null,
            rowCount: tailProbe?.rowCount ?? 0,
            error: tailProbe?.error,
          },
    coverage: {
      apiMinusLocalRows,
      likelyHasNewPks,
    },
    gapProbe: {
      enabled: !args.skipGapProbe,
      maxGapIds: args.maxGapIds,
      idsChecked: gapProbes.length,
      foundExactInApi: gapProbeFoundInApi.length,
      stillMissingInApi: gapProbeMissingInApi.length,
      apiErrors: gapProbeErrors.length,
      foundExactIds: gapProbeFoundInApi.map((item) => item.id),
      stillMissingIds: gapProbeMissingInApi.map((item) => ({
        id: item.id,
        returnedPk: item.returnedPk,
        rowCount: item.rowCount,
      })),
      failures: gapProbeErrors.map((item) => ({
        id: item.id,
        error: item.error,
      })),
    },
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("");
  console.log(`Rows scanned:         ${result.local.rowsScanned.toLocaleString()}`);
  console.log(`Unique IDs:           ${result.local.uniqueIds.toLocaleString()}`);
  console.log(
    `Missing ranges:       ${result.local.missingRangesCount.toLocaleString()}`,
  );
  console.log(
    `Missing IDs total:    ${result.local.missingIdsTotal.toLocaleString()}`,
  );
  console.log(
    `ID span:              ${result.local.minId ?? "-"} .. ${result.local.maxId ?? "-"}`,
  );
  console.log(
    `API row count:        ${result.api.rowCount?.toLocaleString() ?? "n/a"}`,
  );
  console.log(
    `API-local row delta:  ${result.coverage.apiMinusLocalRows?.toLocaleString() ?? "n/a"}`,
  );

  if (result.tailProbe) {
    console.log("");
    console.log(
      `Tail probe (from ${result.tailProbe.startAtId}): hasRow=${result.tailProbe.hasRow}, returnedPk=${result.tailProbe.returnedPk ?? "null"}, rowCount=${result.tailProbe.rowCount}, error=${result.tailProbe.error ?? "-"}`,
    );
  }

  console.log(
    `Likely new PKs not fetched: ${result.coverage.likelyHasNewPks ? "YES" : "NO"}`,
  );

  if (result.gapProbe.enabled) {
    console.log("");
    console.log(
      `Gap IDs checked:      ${result.gapProbe.idsChecked.toLocaleString()} (max=${result.gapProbe.maxGapIds.toLocaleString()})`,
    );
    console.log(
      `Found in API:         ${result.gapProbe.foundExactInApi.toLocaleString()}`,
    );
    console.log(
      `Still missing in API: ${result.gapProbe.stillMissingInApi.toLocaleString()}`,
    );
    console.log(
      `API errors:           ${result.gapProbe.apiErrors.toLocaleString()}`,
    );
    if (result.gapProbe.foundExactIds.length > 0) {
      console.log("");
      console.log("Gap IDs that exist in API (first 50):");
      console.log(`  ${result.gapProbe.foundExactIds.slice(0, 50).join(", ")}`);
    }
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

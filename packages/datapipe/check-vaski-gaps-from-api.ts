import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  pkName: string;
  maxIds: number;
  concurrency: number;
  timeoutMs: number;
  json: boolean;
}

interface PageData {
  columnNames?: string[];
  pkName?: string;
  rowData?: any[][];
}

interface MissingRange {
  start: number;
  end: number;
  count: number;
}

interface ApiBatchResponse {
  columnNames: string[];
  pkName: string;
  pkStartValue?: number | null;
  pkEndValue?: number | null;
  pkLastValue: number | null;
  rowData: any[][];
  rowCount: number;
  hasMore: boolean;
}

function parseArgs(argv: string[]): Args {
  let table = "VaskiData";
  let stage: Stage = "raw";
  let pkName = "Id";
  let maxIds = 500;
  let concurrency = 8;
  let timeoutMs = 10_000;
  let json = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--table" && argv[i + 1]) {
      table = argv[++i];
      continue;
    }
    if (arg === "--stage" && argv[i + 1]) {
      const value = argv[++i];
      if (value === "raw" || value === "parsed") stage = value;
      else throw new Error(`Invalid --stage value: ${value}`);
      continue;
    }
    if (arg === "--pk-name" && argv[i + 1]) {
      pkName = argv[++i];
      continue;
    }
    if (arg === "--max-ids" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --max-ids value: ${argv[i]}`);
      }
      maxIds = value;
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
    if (arg === "--json") {
      json = true;
      continue;
    }
    if (arg === "--help" || arg === "-h") {
      printHelpAndExit();
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { table, stage, pkName, maxIds, concurrency, timeoutMs, json };
}

function printHelpAndExit(): never {
  console.log(`
Check local missing ID gaps against Eduskunta API by probing IDs with:
/api/v1/tables/<table>/batch?pkName=<pkName>&pkStartValue=<id>&perPage=1
Exact hit criterion: response start=id and end=id (accepting pkEndValue/pkLastValue).

Usage:
  bun run packages/datapipe/check-vaski-gaps-from-api.ts [options]

Options:
  --table <name>         Table name (default: VaskiData)
  --stage <raw|parsed>   Local stage to inspect for gaps (default: raw)
  --pk-name <name>       PK name for API probing (default: Id)
  --max-ids <n>          Max missing IDs to probe (default: 500)
  --concurrency <n>      Concurrent API probes (default: 8)
  --timeout-ms <n>       Per-request timeout in ms (default: 10000)
  --json                 Print machine-readable JSON output
  --help, -h             Show help
`);
  process.exit(0);
}

function toNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return Math.trunc(value);
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
  const ids: number[] = [];
  for (const range of ranges) {
    for (let id = range.start; id <= range.end; id++) {
      ids.push(id);
      if (ids.length >= maxIds) return ids;
    }
  }
  return ids;
}

async function readLocalMissingIds(
  table: string,
  stage: Stage,
  pkName: string,
  maxIds: number,
): Promise<{ missingRanges: MissingRange[]; missingIds: number[]; totalRows: number }> {
  const storage = getStorage();
  const prefix = StorageKeyBuilder.listPrefixForTable(stage, table);
  const keys = await listAllStorageKeys(storage, { prefix, pageSize: 10_000 });
  if (keys.length === 0) {
    throw new Error(`No pages found under prefix: ${prefix}`);
  }

  const pages = keys
    .map((k) => ({ key: k.key, page: StorageKeyBuilder.parseKey(k.key)?.page ?? 0 }))
    .sort((a, b) => a.page - b.page);

  const uniqueIds = new Set<number>();
  let totalRows = 0;

  for (const page of pages) {
    const raw = await storage.get(page.key);
    if (!raw) continue;
    const data = JSON.parse(raw) as PageData;
    const columnNames = data.columnNames ?? [];
    const rowData = data.rowData ?? [];
    const pagePkName = data.pkName ?? pkName;
    const pkIndex = columnNames.indexOf(pagePkName);
    if (pkIndex < 0) continue;

    for (const row of rowData) {
      totalRows++;
      const id = toNumericId(row?.[pkIndex]);
      if (id !== null) uniqueIds.add(id);
    }
  }

  const sortedIds = Array.from(uniqueIds).sort((a, b) => a - b);
  const ranges = collectMissingRanges(sortedIds);
  const missingIds = expandMissingIds(ranges, maxIds);

  return { missingRanges: ranges, missingIds, totalRows };
}

async function checkIdFromApi(
  table: string,
  pkName: string,
  id: number,
  timeoutMs: number,
): Promise<{
  id: number;
  foundExact: boolean;
  rowCount: number;
  returnedPk: number | null;
  error?: string;
}> {
  const url = new URL(`https://avoindata.eduskunta.fi/api/v1/tables/${table}/batch`);
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
    if (data.rowCount < 1 || data.rowData.length < 1) {
      return { id, foundExact: false, rowCount: data.rowCount, returnedPk: null };
    }

    const pkIndex = data.columnNames.indexOf(pkName);
    const returnedPk = pkIndex >= 0 ? toNumericId(data.rowData[0]?.[pkIndex]) : null;
    const responseStart =
      typeof data.pkStartValue === "number" ? data.pkStartValue : id;
    const responseEnd =
      typeof data.pkEndValue === "number"
        ? data.pkEndValue
        : typeof data.pkLastValue === "number"
          ? data.pkLastValue
          : null;
    const foundExact = responseStart === id && responseEnd === id;
    return {
      id,
      foundExact,
      rowCount: data.rowCount,
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

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  workerFn: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const current = index++;
      if (current >= items.length) break;
      results[current] = await workerFn(items[current]);
    }
  });

  await Promise.all(workers);
  return results;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  console.log(`Scanning local ${args.stage}/${args.table} for missing IDs...`);

  const local = await readLocalMissingIds(
    args.table,
    args.stage,
    args.pkName,
    args.maxIds,
  );

  console.log(
    `Found ${local.missingRanges.length.toLocaleString()} missing ranges locally. Probing ${local.missingIds.length.toLocaleString()} IDs from those gaps via API...`,
  );

  const checked = await runWithConcurrency(
    local.missingIds,
    args.concurrency,
    (id) => checkIdFromApi(args.table, args.pkName, id, args.timeoutMs),
  );

  const foundExact = checked.filter((c) => c.foundExact);
  const stillMissing = checked.filter((c) => !c.foundExact && !c.error);
  const failed = checked.filter((c) => !!c.error);

  const result = {
    table: args.table,
    stage: args.stage,
    pkName: args.pkName,
    localMissingRanges: local.missingRanges.length,
    idsProbed: checked.length,
    foundExactInApi: foundExact.length,
    stillMissingInApi: stillMissing.length,
    apiErrors: failed.length,
    foundExactIds: foundExact.map((v) => v.id),
    stillMissingIds: stillMissing.map((v) => ({
      id: v.id,
      rowCount: v.rowCount,
      returnedPk: v.returnedPk,
    })),
    failures: failed.map((v) => ({ id: v.id, error: v.error })),
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("");
  console.log(`IDs probed:           ${result.idsProbed.toLocaleString()}`);
  console.log(`Found exact in API:   ${result.foundExactInApi.toLocaleString()}`);
  console.log(`Still missing in API: ${result.stillMissingInApi.toLocaleString()}`);
  console.log(`API errors:           ${result.apiErrors.toLocaleString()}`);

  if (result.foundExactIds.length > 0) {
    console.log("");
    console.log("IDs found in API despite local gap (first 50):");
    console.log(`  ${result.foundExactIds.slice(0, 50).join(", ")}`);
  }

  if (result.stillMissingIds.length > 0) {
    console.log("");
    console.log("Still missing in API (first 50):");
    for (const item of result.stillMissingIds.slice(0, 50)) {
      console.log(
        `  id=${item.id}, rowCount=${item.rowCount}, returnedPk=${item.returnedPk ?? "null"}`,
      );
    }
  }

  if (result.failures.length > 0) {
    console.log("");
    console.log("API failures (first 20):");
    for (const item of result.failures.slice(0, 20)) {
      console.log(`  id=${item.id}: ${item.error}`);
    }
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

import { TableNames } from "#constants";
import { getExactTableCountsByRows } from "#table-counts";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  pkName?: string;
  limit: number;
  verifyApi: boolean;
  verifyLimit: number;
  verifyConcurrency: number;
  timeoutMs: number;
  json: boolean;
}

interface MissingRange {
  start: number;
  end: number;
  count: number;
}

interface ApiBatchResponse {
  columnNames?: string[];
  pkLastValue?: number | string | null;
  rowData?: any[][];
  rowCount?: number;
}

interface RangeVerification extends MissingRange {
  verifiedMissingInApi: boolean;
  apiRowCount: number | null;
  apiFirstRowPk: number | null;
  apiPkLastValue: number | null;
  error?: string;
}

function parseArgs(argv: string[]): Args {
  let table = "";
  let stage: Stage = "raw";
  let pkName: string | undefined;
  let limit = 50;
  let verifyApi = true;
  let verifyLimit: number | null = null;
  let verifyConcurrency = 8;
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
    if (arg === "--limit" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid --limit value: ${argv[i]}`);
      }
      limit = value;
      continue;
    }
    if (arg === "--verify-limit" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid --verify-limit value: ${argv[i]}`);
      }
      verifyLimit = value;
      continue;
    }
    if (arg === "--verify-concurrency" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 1) {
        throw new Error(`Invalid --verify-concurrency value: ${argv[i]}`);
      }
      verifyConcurrency = value;
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
    if (arg === "--no-verify-api") {
      verifyApi = false;
      continue;
    }
    if (arg === "--verify-api") {
      verifyApi = true;
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
    limit,
    verifyApi,
    verifyLimit: verifyLimit ?? limit,
    verifyConcurrency,
    timeoutMs,
    json,
  };
}

function printHelpAndExit(): never {
  console.log(`
Check table ID ranges and report missing ranges.
Also verifies local missing ranges against API by probing each range start:
  /api/v1/tables/<table>/batch?pkName=<pkName>&pkStartValue=<rangeStart>

Range is considered missing in API when first returned row PK is > range end
or when rowCount is 0.
Also resolves exact table-level API row count via /api/v1/tables/<table>/rows.

Usage:
  bun run scripts/check-table-id-ranges.ts <TableName> [options]

Options:
  --table <name>       Table name (alternative to positional argument)
  --stage <raw|parsed> Stage to read (default: raw)
  --pk-name <name>     PK column name (defaults to page metadata/API metadata)
  --limit <n>          How many missing ranges to print (default: 50, 0 = none)
  --verify-limit <n>   How many missing ranges to verify via API (default: --limit)
  --verify-concurrency <n>
                       Concurrent API requests for range verification (default: 8)
  --timeout-ms <n>     API request timeout in ms (default: 10000)
  --no-verify-api      Skip API verification step
  --json               Print machine-readable JSON output
  --help, -h           Show help

Examples:
  bun run scripts/check-table-id-ranges.ts VaskiData
  bun run scripts/check-table-id-ranges.ts SaliDBAanestys --stage parsed --limit 200
  bun run scripts/check-table-id-ranges.ts VaskiData --verify-limit 200
  bun run scripts/check-table-id-ranges.ts --table MemberOfParliament --json
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
    ranges.push({
      start,
      end,
      count: end - start + 1,
    });
  }

  return ranges;
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

async function resolvePkNameFromApi(
  table: string,
  fallbackPkName: string | undefined,
  timeoutMs: number,
): Promise<string> {
  if (fallbackPkName) return fallbackPkName;
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

async function fetchApiTableCount(table: string): Promise<{
  apiTableRowCount: number | null;
  tablesInCountsEndpoint: number | null;
  apiCountsError: string | null;
}> {
  try {
    const data = await getExactTableCountsByRows({ tableName: table });
    const target = data[0];
    return {
      apiTableRowCount:
        typeof target?.rowCount === "number" ? target.rowCount : null,
      tablesInCountsEndpoint: TableNames.length,
      apiCountsError: null,
    };
  } catch (error) {
    return {
      apiTableRowCount: null,
      tablesInCountsEndpoint: TableNames.length,
      apiCountsError: error instanceof Error ? error.message : String(error),
    };
  }
}

async function verifyRangeFromApi(
  table: string,
  pkName: string,
  range: MissingRange,
  timeoutMs: number,
): Promise<RangeVerification> {
  const url = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${table}/batch`,
  );
  url.searchParams.set("pkName", pkName);
  url.searchParams.set("pkStartValue", String(range.start));

  try {
    const resp = await fetch(url.toString(), {
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      return {
        ...range,
        verifiedMissingInApi: false,
        apiRowCount: null,
        apiFirstRowPk: null,
        apiPkLastValue: null,
        error: `HTTP ${resp.status}`,
      };
    }

    const data = (await resp.json()) as ApiBatchResponse;
    const rowCount =
      typeof data.rowCount === "number" && Number.isFinite(data.rowCount)
        ? data.rowCount
        : null;

    const columnNames = data.columnNames ?? [];
    const rowData = data.rowData ?? [];
    const pkIndex = columnNames.indexOf(pkName);
    const apiFirstRowPk =
      pkIndex >= 0 && rowData.length > 0
        ? toNumericId(rowData[0]?.[pkIndex])
        : null;
    const apiPkLastValue = toNumericId(data.pkLastValue);

    let verifiedMissingInApi = false;
    if (rowCount !== null && rowCount < 1) {
      verifiedMissingInApi = true;
    } else if (apiFirstRowPk !== null) {
      verifiedMissingInApi = apiFirstRowPk > range.end;
    }

    return {
      ...range,
      verifiedMissingInApi,
      apiRowCount: rowCount,
      apiFirstRowPk,
      apiPkLastValue,
    };
  } catch (error) {
    return {
      ...range,
      verifiedMissingInApi: false,
      apiRowCount: null,
      apiFirstRowPk: null,
      apiPkLastValue: null,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiCountsPromise = fetchApiTableCount(args.table);

  const { getRawRowStore, getParsedRowStore } = await import(
    "../packages/shared/storage/row-store/factory.ts"
  );
  const rowStore = args.stage === "raw" ? getRawRowStore() : getParsedRowStore();
  const schemas = await rowStore.listColumnSchemas(args.table);
  const detectedPkName: string | null = schemas[0]?.pkName ?? args.pkName ?? null;

  console.log(`Reading ${args.stage}/${args.table} from row store...`);
  const uniqueIds = new Set<number>();
  let rowCount = 0;
  for await (const row of rowStore.list(args.table)) {
    uniqueIds.add(row.pk);
    rowCount++;
  }
  if (rowCount === 0) {
    throw new Error(`No rows found for table: ${args.table} (stage: ${args.stage})`);
  }
  const duplicateCount = 0; // row store guarantees uniqueness (PRIMARY KEY)
  const invalidIdCount = 0; // row store guarantees integer PKs
  const pagesWithNoPkColumn = 0; // not applicable

  const sortedIds = Array.from(uniqueIds).sort((a, b) => a - b);
  const minId = sortedIds.length > 0 ? sortedIds[0] : null;
  const maxId = sortedIds.length > 0 ? sortedIds[sortedIds.length - 1] : null;
  const missingRanges = collectMissingRanges(sortedIds);
  const missingTotal = missingRanges.reduce((sum, r) => sum + r.count, 0);
  const localPkName = args.pkName ?? detectedPkName ?? "Id";

  const { apiTableRowCount, tablesInCountsEndpoint, apiCountsError } =
    await apiCountsPromise;

  const rangesToVerify =
    args.verifyApi && args.verifyLimit > 0
      ? missingRanges.slice(0, args.verifyLimit)
      : [];

  let apiPkName: string | null = null;
  let rangeVerifications: RangeVerification[] = [];

  if (rangesToVerify.length > 0) {
    apiPkName = await resolvePkNameFromApi(
      args.table,
      localPkName,
      args.timeoutMs,
    );
    console.log(
      `Verifying ${rangesToVerify.length.toLocaleString()} missing ranges against API...`,
    );
    rangeVerifications = await runWithConcurrency(
      rangesToVerify,
      args.verifyConcurrency,
      (range) =>
        verifyRangeFromApi(args.table, apiPkName!, range, args.timeoutMs),
    );
  }

  const verifiedMissingRanges = rangeVerifications.filter(
    (v) => !v.error && v.verifiedMissingInApi,
  );
  const rangesFoundInApi = rangeVerifications.filter(
    (v) => !v.error && !v.verifiedMissingInApi,
  );
  const rangeVerificationErrors = rangeVerifications.filter((v) => !!v.error);
  const apiMinusLocalUnique =
    apiTableRowCount === null ? null : apiTableRowCount - uniqueIds.size;
  const apiMinusLocalRows =
    apiTableRowCount === null ? null : apiTableRowCount - rowCount;

  const result = {
    table: args.table,
    stage: args.stage,
    pkName: localPkName,
    apiPkName,
    rowsScanned: rowCount,
    uniqueIds: uniqueIds.size,
    duplicateIds: duplicateCount,
    invalidIds: invalidIdCount,
    minId,
    maxId,
    missingRangesCount: missingRanges.length,
    missingIdsTotal: missingTotal,
    missingRanges,
    apiTableRowCount,
    tablesInCountsEndpoint,
    apiCountsError,
    apiMinusLocalUniqueIds: apiMinusLocalUnique,
    apiMinusLocalRowsScanned: apiMinusLocalRows,
    apiVerificationEnabled: args.verifyApi,
    apiVerificationLimit: args.verifyLimit,
    apiVerificationChecked: rangeVerifications.length,
    apiVerificationVerifiedMissing: verifiedMissingRanges.length,
    apiVerificationFoundInApi: rangesFoundInApi.length,
    apiVerificationErrors: rangeVerificationErrors.length,
    verifiedMissingRanges,
    rangesFoundInApi: rangesFoundInApi.map((v) => ({
      start: v.start,
      end: v.end,
      count: v.count,
      apiRowCount: v.apiRowCount,
      apiFirstRowPk: v.apiFirstRowPk,
      apiPkLastValue: v.apiPkLastValue,
    })),
    verificationFailures: rangeVerificationErrors.map((v) => ({
      start: v.start,
      end: v.end,
      count: v.count,
      error: v.error,
    })),
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("");
  console.log(`Rows scanned:       ${result.rowsScanned.toLocaleString()}`);
  console.log(`Unique IDs:         ${result.uniqueIds.toLocaleString()}`);
  console.log(`Duplicate IDs:      ${result.duplicateIds.toLocaleString()}`);
  console.log(`Invalid IDs:        ${result.invalidIds.toLocaleString()}`);
  console.log(
    `Missing ranges:     ${result.missingRangesCount.toLocaleString()}`,
  );
  console.log(`Missing IDs total:  ${result.missingIdsTotal.toLocaleString()}`);
  console.log(
    `ID span:            ${result.minId ?? "-"} .. ${result.maxId ?? "-"}`,
  );
  console.log("");
  if (result.apiCountsError) {
    console.log(`API /counts:        error (${result.apiCountsError})`);
  } else {
    const apiRowCountLabel =
      result.apiTableRowCount === null
        ? "not found"
        : result.apiTableRowCount.toLocaleString();
    const tableCountLabel =
      result.tablesInCountsEndpoint === null
        ? "-"
        : result.tablesInCountsEndpoint.toLocaleString();
    console.log(
      `API table rowCount: ${apiRowCountLabel} (tables=${tableCountLabel})`,
    );
  }
  console.log(
    `API-local unique:   ${result.apiMinusLocalUniqueIds?.toLocaleString() ?? "-"}`,
  );
  console.log(
    `API-local rows:     ${result.apiMinusLocalRowsScanned?.toLocaleString() ?? "-"}`,
  );
  console.log(
    `Gap IDs total:      ${result.missingIdsTotal.toLocaleString()} (compare vs deltas above)`,
  );

  if (args.verifyApi) {
    console.log("");
    console.log(
      `API checked ranges: ${result.apiVerificationChecked.toLocaleString()} (limit=${result.apiVerificationLimit.toLocaleString()})`,
    );
    console.log(
      `Verified missing:   ${result.apiVerificationVerifiedMissing.toLocaleString()}`,
    );
    console.log(
      `Found in API:       ${result.apiVerificationFoundInApi.toLocaleString()}`,
    );
    console.log(
      `Verification errors:${result.apiVerificationErrors.toLocaleString()}`,
    );
  }

  if (args.limit > 0 && missingRanges.length > 0) {
    const verificationByRange = new Map(
      rangeVerifications.map((v) => [`${v.start}-${v.end}`, v]),
    );

    console.log("");
    console.log(
      `First ${Math.min(args.limit, missingRanges.length)} missing ranges:`,
    );
    for (const range of missingRanges.slice(0, args.limit)) {
      const key = `${range.start}-${range.end}`;
      const verification = verificationByRange.get(key);
      let suffix = "";
      if (verification) {
        const apiRowCount = verification.apiRowCount ?? "null";
        const firstRowPk = verification.apiFirstRowPk ?? "null";
        const pkLast = verification.apiPkLastValue ?? "null";

        if (verification.error) {
          suffix = ` [api-error: ${verification.error}]`;
        } else if (verification.verifiedMissingInApi) {
          suffix = ` [verified-missing, apiRowCount=${apiRowCount}, firstRowPk=${firstRowPk}, pkLast=${pkLast}]`;
        } else {
          suffix = ` [found-in-api, apiRowCount=${apiRowCount}, firstRowPk=${firstRowPk}, pkLast=${pkLast}]`;
        }
      } else if (args.verifyApi && args.verifyLimit > 0) {
        suffix = " [not-checked]";
      }
      console.log(
        `  ${range.start}..${range.end} (${range.count.toLocaleString()} ids)${suffix}`,
      );
    }
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

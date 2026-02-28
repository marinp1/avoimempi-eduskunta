import { TableNames } from "#constants";
import { getExactTableCountsByRows } from "#table-counts";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  pkName?: string;
  timeoutMs: number;
  json: boolean;
}

function parseArgs(argv: string[]): Args {
  let table = "";
  let stage: Stage = "raw";
  let pkName: string | undefined;
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

  return { table, stage, pkName, timeoutMs, json };
}

function printHelpAndExit(): never {
  console.log(`
Compare local table row counts against exact API-derived counts and print diagnostics.

Usage:
  bun run scripts/validate-table-count-vs-api.ts <TableName> [options]

Options:
  --table <name>         Table name (alternative to positional argument)
  --stage <raw|parsed>   Local stage to inspect (default: raw)
  --pk-name <name>       PK column name (defaults to API table metadata)
  --timeout-ms <n>       Per-request timeout in ms (default: 10000)
  --json                 Print machine-readable JSON output
  --help, -h             Show help

Examples:
  bun run scripts/validate-table-count-vs-api.ts SaliDBAanestysEdustaja
  bun run scripts/validate-table-count-vs-api.ts --table VaskiData --stage parsed --json
`);
  process.exit(0);
}

function toNumericId(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value))
    return Math.trunc(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!/^-?\d+$/.test(trimmed)) return null;
    const parsed = Number.parseInt(trimmed, 10);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
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

async function fetchApiPkName(
  table: string,
  timeoutMs: number,
): Promise<string> {
  const url = `https://avoindata.eduskunta.fi/api/v1/tables/${table}/columns`;
  const resp = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
  if (!resp.ok) {
    throw new Error(
      `Could not fetch table columns for ${table}: HTTP ${resp.status}`,
    );
  }
  const data = (await resp.json()) as { pkName?: string };
  if (!data.pkName) {
    throw new Error(`Could not resolve PK name from API for table ${table}`);
  }
  return data.pkName;
}

async function probeNextId(
  table: string,
  pkName: string,
  id: number,
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
  url.searchParams.set("pkStartValue", String(id));
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

    const data = (await resp.json()) as {
      columnNames: string[];
      rowData: any[][];
      rowCount: number;
    };

    if (data.rowCount < 1 || data.rowData.length < 1) {
      return { hasRow: false, returnedPk: null, rowCount: data.rowCount };
    }

    const pkIndex = data.columnNames.indexOf(pkName);
    const returnedPk =
      pkIndex >= 0 ? toNumericId(data.rowData[0]?.[pkIndex]) : null;
    return { hasRow: true, returnedPk, rowCount: data.rowCount };
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

  const [{ apiRowCount, tablesInEndpoint }, localRowCount, localMaxPk] =
    await Promise.all([
      fetchApiCount(args.table),
      rowStore.count(args.table),
      rowStore.maxPk(args.table),
    ]);

  if (localRowCount === 0) {
    throw new Error(
      `No rows found for table: ${args.table} (stage: ${args.stage})`,
    );
  }

  const resolvedPkName =
    args.pkName ?? (await fetchApiPkName(args.table, args.timeoutMs));

  const probe =
    localMaxPk !== null
      ? await probeNextId(
          args.table,
          resolvedPkName,
          localMaxPk + 1,
          args.timeoutMs,
        )
      : null;

  const diffRowsVsApi =
    apiRowCount !== null ? localRowCount - apiRowCount : null;

  const reasons: string[] = [];
  if (apiRowCount === null) {
    reasons.push("Table not found in API counts endpoint.");
  }
  if (probe?.hasRow) {
    reasons.push(
      `API returned at least one row for ${resolvedPkName} >= ${localMaxPk! + 1}, so local data likely behind API.`,
    );
  }
  reasons.push(
    "The API counts endpoint can be stale versus the current batch endpoint data.",
  );

  const result = {
    table: args.table,
    stage: args.stage,
    pkName: resolvedPkName,
    apiRowCount,
    apiCountsTablesListed: tablesInEndpoint,
    localRowCount,
    maxId: localMaxPk,
    probeFromNextId:
      localMaxPk === null
        ? null
        : {
            startAtId: localMaxPk + 1,
            hasRow: probe?.hasRow ?? false,
            returnedPk: probe?.returnedPk ?? null,
            rowCount: probe?.rowCount ?? 0,
            error: probe?.error,
          },
    diffRowsVsApi,
    likelyReasons: reasons,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Table:                ${result.table}`);
  console.log(`Stage:                ${result.stage}`);
  console.log(`PK column:            ${result.pkName}`);
  console.log(`API row count:        ${result.apiRowCount ?? "n/a"}`);
  console.log(`Local row count:      ${result.localRowCount.toLocaleString()}`);
  console.log(`Max local ID:         ${result.maxId ?? "-"}`);
  console.log(
    `Diff rows vs API:     ${result.diffRowsVsApi === null ? "n/a" : result.diffRowsVsApi.toLocaleString()}`,
  );

  if (result.probeFromNextId) {
    console.log("");
    console.log("Probe after local max ID:");
    console.log(
      `  startAtId=${result.probeFromNextId.startAtId}, hasRow=${result.probeFromNextId.hasRow}, returnedPk=${result.probeFromNextId.returnedPk ?? "null"}, rowCount=${result.probeFromNextId.rowCount}, error=${result.probeFromNextId.error ?? "-"}`,
    );
  }

  console.log("");
  console.log("Likely reasons:");
  for (const reason of result.likelyReasons) {
    console.log(`  - ${reason}`);
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

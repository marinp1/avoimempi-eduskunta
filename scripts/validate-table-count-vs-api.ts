import { TableNames } from "#constants";
import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";
import { getExactTableCountsByRows } from "#table-counts";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  pkName?: string;
  timeoutMs: number;
  json: boolean;
}

interface PageData {
  columnNames?: string[];
  pkName?: string;
  rowCount?: number;
  rowData?: any[][];
  hasMore?: boolean;
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
  const storage = getStorage();
  const prefix = StorageKeyBuilder.listPrefixForTable(args.stage, args.table);

  const [{ apiRowCount, tablesInEndpoint }, keys] = await Promise.all([
    fetchApiCount(args.table),
    listAllStorageKeys(storage, { prefix, pageSize: 10_000 }),
  ]);

  if (keys.length === 0) {
    throw new Error(`No pages found under prefix: ${prefix}`);
  }

  const resolvedPkName =
    args.pkName ?? (await fetchApiPkName(args.table, args.timeoutMs));

  const pages = keys
    .map((k) => ({
      key: k.key,
      page: StorageKeyBuilder.parseKey(k.key)?.page ?? 0,
    }))
    .sort((a, b) => a.page - b.page);

  let localRowsByRowData = 0;
  let localRowsByRowCountField = 0;
  let pagesWithNoPkColumn = 0;
  let pagesWithRowCountMismatch = 0;
  const rowCountMismatchPages: Array<{
    page: number;
    rowDataLength: number;
    rowCountField: number | null;
  }> = [];

  const uniqueIds = new Set<number>();
  let duplicateIds = 0;
  let invalidIds = 0;
  let minId: number | null = null;
  let maxId: number | null = null;

  let lastPageHasMore: boolean | null = null;
  let lastPageNumber = 0;

  for (const page of pages) {
    const raw = await storage.get(page.key);
    if (!raw) continue;

    const data = JSON.parse(raw) as PageData;
    const rowData = data.rowData ?? [];
    const rowCountField =
      typeof data.rowCount === "number" && Number.isFinite(data.rowCount)
        ? data.rowCount
        : null;
    const pagePkName = data.pkName ?? resolvedPkName;
    const columnNames = data.columnNames ?? [];
    const pkIndex = columnNames.indexOf(pagePkName);

    localRowsByRowData += rowData.length;
    if (rowCountField !== null) {
      localRowsByRowCountField += rowCountField;
      if (rowCountField !== rowData.length) {
        pagesWithRowCountMismatch++;
        if (rowCountMismatchPages.length < 25) {
          rowCountMismatchPages.push({
            page: page.page,
            rowDataLength: rowData.length,
            rowCountField,
          });
        }
      }
    } else {
      localRowsByRowCountField += rowData.length;
    }

    if (pkIndex < 0) {
      pagesWithNoPkColumn++;
    } else {
      for (const row of rowData) {
        const numericId = toNumericId(row?.[pkIndex]);
        if (numericId === null) {
          invalidIds++;
          continue;
        }
        if (uniqueIds.has(numericId)) {
          duplicateIds++;
        } else {
          uniqueIds.add(numericId);
          minId = minId === null ? numericId : Math.min(minId, numericId);
          maxId = maxId === null ? numericId : Math.max(maxId, numericId);
        }
      }
    }

    if (page.page >= lastPageNumber) {
      lastPageNumber = page.page;
      if (typeof data.hasMore === "boolean") {
        lastPageHasMore = data.hasMore;
      }
    }
  }

  const probe =
    maxId !== null
      ? await probeNextId(args.table, resolvedPkName, maxId + 1, args.timeoutMs)
      : null;

  const diffRowsVsApi =
    apiRowCount !== null ? localRowsByRowData - apiRowCount : null;
  const diffUniqueVsApi =
    apiRowCount !== null ? uniqueIds.size - apiRowCount : null;

  const reasons: string[] = [];
  if (apiRowCount === null) {
    reasons.push("Table not found in API counts endpoint.");
  }
  if (lastPageHasMore === true) {
    reasons.push(
      "Local last page indicates hasMore=true, so scraping likely incomplete.",
    );
  }
  if (probe?.hasRow) {
    reasons.push(
      `API returned at least one row for ${resolvedPkName} >= ${maxId! + 1}, so local data likely behind API.`,
    );
  }
  if (duplicateIds > 0) {
    reasons.push(
      `Local data contains duplicate primary keys (${duplicateIds.toLocaleString()}).`,
    );
  }
  if (invalidIds > 0) {
    reasons.push(
      `Local data has non-numeric/invalid PK values (${invalidIds.toLocaleString()}).`,
    );
  }
  if (pagesWithNoPkColumn > 0) {
    reasons.push(
      `Some pages are missing the PK column (${pagesWithNoPkColumn.toLocaleString()} pages).`,
    );
  }
  if (pagesWithRowCountMismatch > 0) {
    reasons.push(
      `Some pages have rowCount != rowData.length (${pagesWithRowCountMismatch.toLocaleString()} pages).`,
    );
  }
  reasons.push(
    "The API counts endpoint can be stale versus the current batch endpoint data.",
  );

  const result = {
    table: args.table,
    stage: args.stage,
    pkName: resolvedPkName,
    pagesScanned: pages.length,
    apiRowCount,
    apiCountsTablesListed: tablesInEndpoint,
    localRowsByRowData,
    localRowsByRowCountField,
    localUniqueIds: uniqueIds.size,
    duplicateIds,
    invalidIds,
    pagesWithNoPkColumn,
    pagesWithRowCountMismatch,
    rowCountMismatchPages,
    minId,
    maxId,
    lastPageNumber,
    lastPageHasMore,
    probeFromNextId:
      maxId === null
        ? null
        : {
            startAtId: maxId + 1,
            hasRow: probe?.hasRow ?? false,
            returnedPk: probe?.returnedPk ?? null,
            rowCount: probe?.rowCount ?? 0,
            error: probe?.error,
          },
    diffRowsVsApi,
    diffUniqueVsApi,
    likelyReasons: reasons,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(`Table:                ${result.table}`);
  console.log(`Stage:                ${result.stage}`);
  console.log(`PK column:            ${result.pkName}`);
  console.log(`Pages scanned:        ${result.pagesScanned.toLocaleString()}`);
  console.log(`API row count:        ${result.apiRowCount ?? "n/a"}`);
  console.log(
    `Local rows (rowData): ${result.localRowsByRowData.toLocaleString()}`,
  );
  console.log(
    `Local unique IDs:     ${result.localUniqueIds.toLocaleString()}`,
  );
  console.log(`Duplicate IDs:        ${result.duplicateIds.toLocaleString()}`);
  console.log(`Invalid IDs:          ${result.invalidIds.toLocaleString()}`);
  console.log(
    `ID span:              ${result.minId ?? "-"} .. ${result.maxId ?? "-"}`,
  );
  console.log(`Last page hasMore:    ${result.lastPageHasMore ?? "unknown"}`);
  console.log(
    `Diff rows vs API:     ${result.diffRowsVsApi === null ? "n/a" : result.diffRowsVsApi.toLocaleString()}`,
  );
  console.log(
    `Diff unique vs API:   ${result.diffUniqueVsApi === null ? "n/a" : result.diffUniqueVsApi.toLocaleString()}`,
  );

  if (result.probeFromNextId) {
    console.log("");
    console.log("Probe after local max ID:");
    console.log(
      `  startAtId=${result.probeFromNextId.startAtId}, hasRow=${result.probeFromNextId.hasRow}, returnedPk=${result.probeFromNextId.returnedPk ?? "null"}, rowCount=${result.probeFromNextId.rowCount}, error=${result.probeFromNextId.error ?? "-"}`,
    );
  }

  if (result.rowCountMismatchPages.length > 0) {
    console.log("");
    console.log("Pages with rowCount mismatch (first 25):");
    for (const page of result.rowCountMismatchPages) {
      console.log(
        `  page=${page.page}, rowCountField=${page.rowCountField ?? "null"}, rowDataLength=${page.rowDataLength}`,
      );
    }
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

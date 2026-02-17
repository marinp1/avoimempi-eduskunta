import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";

type Stage = "raw" | "parsed";

interface Args {
  table: string;
  stage: Stage;
  limit: number;
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

function parseArgs(argv: string[]): Args {
  let table = "VaskiData";
  let stage: Stage = "raw";
  let limit = 50;
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
    if (arg === "--limit" && argv[i + 1]) {
      const value = Number.parseInt(argv[++i], 10);
      if (!Number.isFinite(value) || value < 0) {
        throw new Error(`Invalid --limit value: ${argv[i]}`);
      }
      limit = value;
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

  return { table, stage, limit, json };
}

function printHelpAndExit(): never {
  console.log(`
Check Vaski/table ID ranges and report missing ranges.

Usage:
  bun run packages/datapipe/check-vaski-id-ranges.ts [options]

Options:
  --table <name>       Table name (default: VaskiData)
  --stage <raw|parsed> Stage to read (default: raw)
  --limit <n>          How many missing ranges to print (default: 50, 0 = none)
  --json               Print machine-readable JSON output
  --help, -h           Show help

Examples:
  bun run packages/datapipe/check-vaski-id-ranges.ts
  bun run packages/datapipe/check-vaski-id-ranges.ts --stage parsed --limit 200
  bun run packages/datapipe/check-vaski-id-ranges.ts --table VaskiData --json
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

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const storage = getStorage();
  const prefix = StorageKeyBuilder.listPrefixForTable(args.stage, args.table);

  console.log(`Reading ${args.stage}/${args.table} via ${storage.name} storage...`);
  const keys = await listAllStorageKeys(storage, { prefix, pageSize: 10_000 });

  if (keys.length === 0) {
    throw new Error(`No pages found under prefix: ${prefix}`);
  }

  const pages = keys
    .map((k) => ({
      key: k.key,
      page: StorageKeyBuilder.parseKey(k.key)?.page ?? 0,
    }))
    .sort((a, b) => a.page - b.page);

  const uniqueIds = new Set<number>();
  let rowCount = 0;
  let duplicateCount = 0;
  let invalidIdCount = 0;
  let pagesWithNoPkColumn = 0;

  for (const page of pages) {
    const raw = await storage.get(page.key);
    if (!raw) continue;

    const data = JSON.parse(raw) as PageData;
    const columnNames = data.columnNames ?? [];
    const rowData = data.rowData ?? [];
    const pkName = data.pkName ?? "Id";
    const pkIndex = columnNames.indexOf(pkName);

    if (pkIndex < 0) {
      pagesWithNoPkColumn++;
      continue;
    }

    for (const row of rowData) {
      rowCount++;
      const numericId = toNumericId(row?.[pkIndex]);
      if (numericId === null) {
        invalidIdCount++;
        continue;
      }

      if (uniqueIds.has(numericId)) {
        duplicateCount++;
      } else {
        uniqueIds.add(numericId);
      }
    }
  }

  const sortedIds = Array.from(uniqueIds).sort((a, b) => a - b);
  const minId = sortedIds.length > 0 ? sortedIds[0] : null;
  const maxId = sortedIds.length > 0 ? sortedIds[sortedIds.length - 1] : null;
  const missingRanges = collectMissingRanges(sortedIds);
  const missingTotal = missingRanges.reduce((sum, r) => sum + r.count, 0);

  const result = {
    table: args.table,
    stage: args.stage,
    pagesScanned: pages.length,
    rowsScanned: rowCount,
    uniqueIds: uniqueIds.size,
    duplicateIds: duplicateCount,
    invalidIds: invalidIdCount,
    pagesWithNoPkColumn,
    minId,
    maxId,
    missingRangesCount: missingRanges.length,
    missingIdsTotal: missingTotal,
    missingRanges,
  };

  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log("");
  console.log(`Pages scanned:      ${result.pagesScanned.toLocaleString()}`);
  console.log(`Rows scanned:       ${result.rowsScanned.toLocaleString()}`);
  console.log(`Unique IDs:         ${result.uniqueIds.toLocaleString()}`);
  console.log(`Duplicate IDs:      ${result.duplicateIds.toLocaleString()}`);
  console.log(`Invalid IDs:        ${result.invalidIds.toLocaleString()}`);
  console.log(`Missing ranges:     ${result.missingRangesCount.toLocaleString()}`);
  console.log(`Missing IDs total:  ${result.missingIdsTotal.toLocaleString()}`);
  console.log(
    `ID span:            ${result.minId ?? "-"} .. ${result.maxId ?? "-"}`,
  );

  if (args.limit > 0 && missingRanges.length > 0) {
    console.log("");
    console.log(`First ${Math.min(args.limit, missingRanges.length)} missing ranges:`);
    for (const range of missingRanges.slice(0, args.limit)) {
      console.log(
        `  ${range.start}..${range.end} (${range.count.toLocaleString()} ids)`,
      );
    }
  }
}

main().catch((error) => {
  console.error("❌", error instanceof Error ? error.message : String(error));
  process.exit(1);
});

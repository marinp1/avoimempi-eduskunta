#!/usr/bin/env bun
import {
  ActivePipelineTableNames,
  OmittedPipelineTableNames,
} from "#constants";
import { getRawRowStore } from "#storage/row-store/factory";
import { getExactTableCountsByRows } from "#table-counts";
import { type ScrapeMode, scrapeTable } from "./scraper";

async function main() {
  const args = process.argv.slice(2);

  if (
    args.length === 0 ||
    args[0] === "help" ||
    args[0] === "--help" ||
    args[0] === "-h"
  ) {
    printHelp();
    process.exit(0);
  }

  if (args[0] === "status") {
    await showStatus();
    return;
  }
  // Parse arguments
  const tableName = args[0];
  let mode: ScrapeMode = { type: "auto-resume" };

  const parsePk = (value: string | null, flagName: string): number => {
    const pk = parseInt(value ?? "", 10);
    if (Number.isNaN(pk) || pk < 0) {
      console.error(
        `❌ Error: ${flagName} value must be a non-negative integer`,
      );
      process.exit(1);
    }
    return pk;
  };

  const readFlagValue = (
    rawArg: string,
    argIndex: number,
  ): { value: string | null; consumedNext: boolean } => {
    const eqIndex = rawArg.indexOf("=");
    if (eqIndex !== -1) {
      return { value: rawArg.slice(eqIndex + 1), consumedNext: false };
    }
    return { value: args[argIndex + 1] ?? null, consumedNext: true };
  };

  let fromPk: number | null = null;
  let toPk: number | null = null;
  let patchPk: number | null = null;
  let singlePk: number | null = null;

  for (let i = 1; i < args.length; i++) {
    const rawArg = args[i];
    const flag = rawArg.split("=")[0];

    if (
      flag === "--from-pk" ||
      flag === "-f" ||
      flag === "--to-pk" ||
      flag === "-t" ||
      flag === "--patch-pk" ||
      flag === "--single-pk"
    ) {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;

      if (flag === "--from-pk" || flag === "-f") {
        fromPk = parsePk(value, flag);
      } else if (flag === "--to-pk" || flag === "-t") {
        toPk = parsePk(value, flag);
      } else if (flag === "--patch-pk") {
        patchPk = parsePk(value, flag);
      } else if (flag === "--single-pk") {
        singlePk = parsePk(value, flag);
      }
      continue;
    }

    console.error(`❌ Error: Unknown flag: ${rawArg}`);
    printHelp();
    process.exit(1);
  }

  if (
    patchPk !== null &&
    (fromPk !== null || toPk !== null || singlePk !== null)
  ) {
    console.error(
      "❌ Error: --patch-pk cannot be combined with --from-pk/--to-pk/--single-pk",
    );
    process.exit(1);
  }

  if (singlePk !== null && (fromPk !== null || toPk !== null)) {
    console.error(
      "❌ Error: --single-pk cannot be combined with --from-pk/--to-pk",
    );
    process.exit(1);
  }

  if (toPk !== null && fromPk === null) {
    console.error("❌ Error: --to-pk requires --from-pk");
    process.exit(1);
  }

  if (fromPk !== null && toPk !== null && toPk < fromPk) {
    console.error(
      "❌ Error: --to-pk must be greater than or equal to --from-pk",
    );
    process.exit(1);
  }

  if (patchPk !== null) {
    mode = { type: "patch-from-pk", pkStartValue: patchPk };
  } else if (singlePk !== null) {
    mode = { type: "range", pkStartValue: singlePk, pkEndValue: singlePk };
  } else if (fromPk !== null && toPk !== null) {
    mode = { type: "range", pkStartValue: fromPk, pkEndValue: toPk };
  } else if (fromPk !== null) {
    mode = { type: "start-from-pk", pkStartValue: fromPk };
  }

  await scrapeTable({
    tableName,
    mode,
    onProgress: (_progress) => {
      // Progress is already logged in scrapeTable
    },
  });
}

async function showStatus() {
  const rawStore = getRawRowStore();
  const tablesWithData = await rawStore.tableNames();
  const trackedTableNames = new Set<string>(ActivePipelineTableNames);
  const trackedTablesWithData = tablesWithData.filter((tableName) =>
    trackedTableNames.has(tableName),
  );

  if (trackedTablesWithData.length === 0) {
    console.error("❌ No data found in raw store.");
    console.error(
      "   Run the scraper first to populate it: bun run scrape <TableName>",
    );
    console.error(
      `   Omitted from status: ${OmittedPipelineTableNames.join(", ")}`,
    );
    process.exit(1);
  }

  console.log("📊 Scraping Status\n");

  const data = await getExactTableCountsByRows({
    tableNames: ActivePipelineTableNames,
  });

  for (const table of data) {
    const exactRows = await rawStore.count(table.tableName);
    const percentComplete =
      table.rowCount > 0 ? (exactRows / table.rowCount) * 100 : 0;

    const status =
      exactRows === 0
        ? "❌ Not started"
        : percentComplete >= 99.9
          ? "✅ Complete"
          : "⏳ In progress";

    console.log(
      `${status} ${table.tableName.padEnd(30)} - ${exactRows.toLocaleString()} / ${table.rowCount.toLocaleString()} rows (${percentComplete.toFixed(1)}%)`,
    );
  }

  console.log(
    `\n🚫 Omitted from scrape status: ${OmittedPipelineTableNames.join(", ")}`,
  );
}

function printHelp() {
  console.log(`
🗂️  Eduskunta Data Pipeline - Scraper

Usage:
  bun cli.ts <TableName> [options]
  bun cli.ts status

Modes:
  Auto-resume (default)
    bun cli.ts <TableName>
    Automatically continues from last scraped batch (by primary key)

  Start from PK
    bun cli.ts <TableName> --from-pk <pk>
    bun cli.ts <TableName> -f <pk>
    Starts from the given primary key value and continues until end

  Range (inclusive)
    bun cli.ts <TableName> --from-pk <start> --to-pk <end>
    bun cli.ts <TableName> -f <start> -t <end>
    Scrapes only PK range [start, end] and stops

  Single PK refresh
    bun cli.ts <TableName> --single-pk <pk>
    Equivalent to --from-pk <pk> --to-pk <pk>

  Patch from PK
    bun cli.ts <TableName> --patch-pk <pk>
    Scrapes patch page from PK and one follow-up page (max 2 API calls)

Commands:
  status                Show scraping status for all tables
  help                  Show this help message

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts MemberOfParliament --from-pk 401
  bun cli.ts MemberOfParliament --from-pk 82300 --to-pk 82400
  bun cli.ts MemberOfParliament --single-pk 82310
  bun cli.ts MemberOfParliament --patch-pk 82310
  bun cli.ts status

Environment Variables:
  ROW_STORE_DIR         Row-store directory (contains raw.db, parsed.db)
  STORAGE_LOCAL_DIR     Fallback directory if ROW_STORE_DIR is not set

Common Tables:
  MemberOfParliament
  SaliDBAanestys
  SaliDBAanestysEdustaja
  SaliDBIstunto
  SaliDBKohta

Notes:
  - Auto-resume is the default behavior
  - Use --from-pk / --to-pk for targeted re-scraping and gap repairs
  - Use --single-pk to re-fetch one exact PK from source
  - Use --patch-pk to fix a missing row by re-scraping its page + one follow-up (max 2 API calls)
  - Each page contains ~100 rows from the API
  - Omitted from status checks: ${OmittedPipelineTableNames.join(", ")}

For more information, see: shared/storage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

#!/usr/bin/env bun
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

  // Check for flags — supports both "--flag value" and "--flag=value"
  function parseFlagValue(flag: string, nextArg: string | undefined): string | null {
    const eqIndex = flag.indexOf("=");
    if (eqIndex !== -1) return flag.slice(eqIndex + 1);
    return nextArg ?? null;
  }

  if (args.length > 1) {
    const flag = args[1].split("=")[0];
    const value = parseFlagValue(args[1], args[2]);

    if (flag === "--from-pk" || flag === "-f") {
      const pk = parseInt(value ?? "", 10);
      if (Number.isNaN(pk) || pk < 0) {
        console.error("❌ Error: PK value must be a non-negative integer");
        process.exit(1);
      }
      mode = { type: "start-from-pk", pkStartValue: pk };
    } else if (flag === "--patch-pk") {
      const pk = parseInt(value ?? "", 10);
      if (Number.isNaN(pk) || pk < 0) {
        console.error("❌ Error: PK value must be a non-negative integer");
        process.exit(1);
      }
      mode = { type: "patch-from-pk", pkStartValue: pk };
    } else {
      console.error(`❌ Error: Unknown flag: ${args[1]}`);
      printHelp();
      process.exit(1);
    }
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
  const { hasSourceStageStatus, loadSourceStageStatusMap } = await import(
    "#storage/source-status"
  );

  if (!(await hasSourceStageStatus())) {
    console.error("❌ Status metadata file not found.");
    console.error(
      "   Run the scraper first to populate it: bun run scrape <TableName>",
    );
    process.exit(1);
  }

  console.log("📊 Scraping Status\n");

  const [data, snapshots] = await Promise.all([
    getExactTableCountsByRows(),
    loadSourceStageStatusMap(),
  ]);

  for (const table of data) {
    const snapshot = snapshots[`raw:${table.tableName}`];
    const pageCount = snapshot?.pageCount ?? 0;
    const exactRows = snapshot?.totalRowCount ?? 0;

    const percentComplete =
      table.rowCount > 0 ? (exactRows / table.rowCount) * 100 : 0;

    const status =
      pageCount === 0
        ? "❌ Not started"
        : percentComplete >= 99.9
          ? "✅ Complete"
          : "⏳ In progress";

    console.log(
      `${status} ${table.tableName.padEnd(30)} - ${pageCount} pages (${exactRows.toLocaleString()} / ${table.rowCount.toLocaleString()} rows, ${percentComplete.toFixed(1)}%)`,
    );
  }
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

  Patch from PK
    bun cli.ts <TableName> --patch-pk <pk>
    Scrapes patch page [A,B] from pk, deletes subsumed pages with firstPk in (A,B],
    then scrapes one follow-up page from B+1 and stops (max 2 API calls)

Commands:
  status                Show scraping status for all tables
  help                  Show this help message

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts MemberOfParliament --from-pk 401
  bun cli.ts MemberOfParliament --patch-pk 82310
  bun cli.ts status

Environment Variables:
  STORAGE_PROVIDER      Storage backend (local, s3, r2, minio) [default: local]
  STORAGE_LOCAL_DIR     Local storage directory [default: ./data]

Common Tables:
  MemberOfParliament
  SaliDBAanestys
  SaliDBAanestysEdustaja
  SaliDBIstunto
  SaliDBKohta

Notes:
  - Auto-resume is the default behavior
  - Auto-resume is the default — use --from-pk to re-scrape from a specific point
  - Use --patch-pk to fix a missing row by re-scraping its page + one follow-up (max 2 API calls)
  - Each page contains ~100 rows from the API

For more information, see: shared/storage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

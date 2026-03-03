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

  // Parse flags
  let runAll = false;
  let maxRuntimeSeconds: number | null = null;
  let fromPk: number | null = null;
  let toPk: number | null = null;
  let patchPk: number | null = null;
  let singlePk: number | null = null;
  let tableName = "";

  const parsePk = (value: string | null, flagName: string): number => {
    const pk = parseInt(value ?? "", 10);
    if (Number.isNaN(pk) || pk < 0) {
      console.error(`❌ Error: ${flagName} value must be a non-negative integer`);
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

  for (let i = 0; i < args.length; i++) {
    const rawArg = args[i];
    const flag = rawArg.split("=")[0];

    if (rawArg === "all" || flag === "--all") {
      runAll = true;
      continue;
    }

    if (flag === "--max-runtime") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      const secs = parseInt(value ?? "", 10);
      if (Number.isNaN(secs) || secs <= 0) {
        console.error("❌ Error: --max-runtime value must be a positive integer (seconds)");
        process.exit(1);
      }
      maxRuntimeSeconds = secs;
      continue;
    }

    if (
      flag === "--from-pk" || flag === "-f" ||
      flag === "--to-pk"   || flag === "-t" ||
      flag === "--patch-pk" ||
      flag === "--single-pk"
    ) {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;
      if (flag === "--from-pk" || flag === "-f") fromPk = parsePk(value, flag);
      else if (flag === "--to-pk" || flag === "-t") toPk = parsePk(value, flag);
      else if (flag === "--patch-pk") patchPk = parsePk(value, flag);
      else if (flag === "--single-pk") singlePk = parsePk(value, flag);
      continue;
    }

    if (rawArg.startsWith("-")) {
      console.error(`❌ Error: Unknown flag: ${rawArg}`);
      printHelp();
      process.exit(1);
    }

    if (!tableName) {
      tableName = rawArg;
    } else {
      console.error(`❌ Error: Unexpected argument '${rawArg}'`);
      printHelp();
      process.exit(1);
    }
  }

  // "all" mode
  if (runAll || tableName === "all") {
    const startTime = Date.now();
    for (const table of ActivePipelineTableNames) {
      if (maxRuntimeSeconds !== null) {
        const elapsedSeconds = (Date.now() - startTime) / 1000;
        if (elapsedSeconds >= maxRuntimeSeconds) {
          console.log(`\n⏱️  Runtime cap (${maxRuntimeSeconds}s) reached after ${elapsedSeconds.toFixed(0)}s, stopping.`);
          break;
        }
      }
      try {
        await scrapeTable({ tableName: table, mode: { type: "auto-resume" } });
      } catch (error) {
        console.error(`❌ Error scraping ${table}:`, error);
      }
    }
    return;
  }

  // Single-table mode
  if (!tableName) {
    console.error("❌ No table specified");
    printHelp();
    process.exit(1);
  }

  if (patchPk !== null && (fromPk !== null || toPk !== null || singlePk !== null)) {
    console.error("❌ Error: --patch-pk cannot be combined with --from-pk/--to-pk/--single-pk");
    process.exit(1);
  }
  if (singlePk !== null && (fromPk !== null || toPk !== null)) {
    console.error("❌ Error: --single-pk cannot be combined with --from-pk/--to-pk");
    process.exit(1);
  }
  if (toPk !== null && fromPk === null) {
    console.error("❌ Error: --to-pk requires --from-pk");
    process.exit(1);
  }
  if (fromPk !== null && toPk !== null && toPk < fromPk) {
    console.error("❌ Error: --to-pk must be >= --from-pk");
    process.exit(1);
  }

  let mode: ScrapeMode = { type: "auto-resume" };
  if (patchPk !== null) mode = { type: "patch-from-pk", pkStartValue: patchPk };
  else if (singlePk !== null) mode = { type: "range", pkStartValue: singlePk, pkEndValue: singlePk };
  else if (fromPk !== null && toPk !== null) mode = { type: "range", pkStartValue: fromPk, pkEndValue: toPk };
  else if (fromPk !== null) mode = { type: "start-from-pk", pkStartValue: fromPk };

  await scrapeTable({ tableName, mode, onProgress: (_progress) => {} });
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
    console.error("   Run the scraper first: bun run scrape <TableName>");
    console.error(`   Omitted: ${OmittedPipelineTableNames.join(", ")}`);
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

  console.log(`\n🚫 Omitted: ${OmittedPipelineTableNames.join(", ")}`);
}

function printHelp() {
  console.log(`
🗂️  Eduskunta Data Pipeline - Scraper

Usage:
  bun cli.ts <TableName> [options]
  bun cli.ts all [--max-runtime <seconds>]
  bun cli.ts status

Commands:
  <TableName>   Scrape a single table (auto-resumes from last PK)
  all           Scrape all active tables in sequence
  status        Show scraping status for all tables

Single-table flags:
  --from-pk, -f <pk>      Start from this PK and continue to end
  --to-pk, -t <pk>        Stop at this PK (requires --from-pk)
  --single-pk <pk>        Re-fetch exactly one PK
  --patch-pk <pk>         Re-scrape the page containing this PK + one follow-up

All-tables flags:
  --max-runtime <seconds> Stop after this many seconds (default: unlimited)

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts MemberOfParliament --from-pk 401
  bun cli.ts MemberOfParliament --from-pk 82300 --to-pk 82400
  bun cli.ts MemberOfParliament --single-pk 82310
  bun cli.ts all
  bun cli.ts all --max-runtime 1800
  bun cli.ts status

Omitted from 'all': ${OmittedPipelineTableNames.join(", ")}
`);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

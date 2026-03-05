#!/usr/bin/env bun
import {
  ActivePipelineTableNames,
  OmittedPipelineTableNames,
} from "#constants";
import { fetchAndPersistTableCounts } from "#table-counts";

async function main() {
  const args = process.argv.slice(2);

  if (
    args.includes("help") ||
    args.includes("--help") ||
    args.includes("-h")
  ) {
    printHelp();
    process.exit(0);
  }

  const quiet = args.includes("--quiet") || args.includes("-q");

  console.log(
    `Fetching row counts for ${ActivePipelineTableNames.length} tables from API...`,
  );

  const rows = await fetchAndPersistTableCounts({
    tableNames: ActivePipelineTableNames,
    concurrency: 4,
    log: !quiet,
    skipOnError: true,
  });

  console.log(`\nFetched and saved counts for ${rows.length} tables:`);

  const maxNameLength = Math.max(...rows.map((r) => r.tableName.length));
  for (const { tableName, rowCount } of rows) {
    console.log(
      `  ${tableName.padEnd(maxNameLength)}  ${rowCount.toLocaleString()} rows`,
    );
  }

  if (rows.length < ActivePipelineTableNames.length) {
    const fetched = new Set(rows.map((r) => r.tableName));
    const failed = ActivePipelineTableNames.filter((t) => !fetched.has(t));
    console.warn(`\nFailed to fetch counts for: ${failed.join(", ")}`);
  }

  console.log(`\nOmitted: ${OmittedPipelineTableNames.join(", ")}`);
  console.log(`\nCounts saved to storage (metadata/api-table-counts.json).`);
}

function printHelp() {
  console.log(`
Eduskunta Data Pipeline - Fetch Table Counts

Usage:
  bun fetch-counts-cli.ts [options]

Options:
  --quiet, -q   Suppress per-table fetch progress output

Description:
  Fetches the current row count for every active pipeline table from the
  Eduskunta API and saves the results to storage (metadata/api-table-counts.json).

  Run this on a schedule before scraping. The scraper can then use the saved
  counts to skip tables that have not changed since the last scrape.

Omitted from pipeline: ${OmittedPipelineTableNames.join(", ")}
`);
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

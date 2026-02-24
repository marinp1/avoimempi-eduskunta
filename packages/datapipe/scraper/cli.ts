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

  // Check for flags
  if (args.length > 1) {
    const flag = args[1];
    const value = args[2];

    if (flag === "--from" || flag === "-f") {
      const page = parseInt(value, 10);
      if (Number.isNaN(page) || page < 1) {
        console.error("❌ Error: Page number must be a positive integer");
        process.exit(1);
      }
      mode = { type: "start-from", page };
    } else if (flag === "--page" || flag === "-p") {
      const page = parseInt(value, 10);
      if (Number.isNaN(page) || page < 1) {
        console.error("❌ Error: Page number must be a positive integer");
        process.exit(1);
      }
      mode = { type: "single-page", page };
    } else {
      // Backward compatibility: treat as page number for start-from
      const page = parseInt(flag, 10);
      if (!Number.isNaN(page) && page >= 1) {
        mode = { type: "start-from", page };
      } else {
        console.error(`❌ Error: Unknown flag: ${flag}`);
        printHelp();
        process.exit(1);
      }
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
  const { getStorage, listAllStorageKeys, StorageKeyBuilder } = await import(
    "#storage"
  );
  const storage = getStorage();

  console.log("📊 Scraping Status\n");

  const data = await getExactTableCountsByRows();

  for (const table of data) {
    const prefix = StorageKeyBuilder.listPrefixForTable("raw", table.tableName);
    const keys = await listAllStorageKeys(storage, { prefix });

    const pageCount = keys.length;

    // Calculate exact row count: ((pageCount - 1) * 100) + rows in last page
    let exactRows = 0;
    if (pageCount > 0) {
      // Parse page numbers to find the highest page
      const pageNumbers = keys
        .map((key) => StorageKeyBuilder.parseKey(key.key))
        .filter((ref) => ref !== null)
        .map((ref) => ref?.page);

      const lastPage = Math.max(...pageNumbers);

      // Read the last page to get exact row count
      const lastPageKey = StorageKeyBuilder.forPage(
        "raw",
        table.tableName,
        lastPage,
      );
      const lastPageData = await storage.get(lastPageKey);

      if (lastPageData) {
        try {
          const lastPageContent = JSON.parse(lastPageData) as {
            rowCount: number;
          };
          exactRows = (pageCount - 1) * 100 + lastPageContent.rowCount;
        } catch (_error) {
          // Fallback to estimate if parsing fails
          exactRows = pageCount * 100;
        }
      } else {
        // Fallback to estimate if reading fails
        exactRows = pageCount * 100;
      }
    }

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
    Automatically continues from last scraped page

  Start from page
    bun cli.ts <TableName> --from <page>
    bun cli.ts <TableName> -f <page>
    bun cli.ts <TableName> <page>          (shorthand)
    Starts from specified page and continues until end

  Single page
    bun cli.ts <TableName> --page <page>
    bun cli.ts <TableName> -p <page>
    Scrapes only the specified page

Commands:
  status                Show scraping status for all tables
  help                  Show this help message

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts MemberOfParliament --from 5
  bun cli.ts MemberOfParliament -p 10
  bun cli.ts SaliDBAanestys 5
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
  - Use --from to re-scrape from a specific point
  - Use --page to scrape/re-scrape a single page (useful for debugging)
  - Each page contains ~100 rows from the API

For more information, see: shared/storage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

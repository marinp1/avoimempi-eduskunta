#!/usr/bin/env bun
import { TableNames } from "#constants";
import { parseTable, parseTables } from "./parser";

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const positionalArgs = args.filter((arg) => !arg.startsWith("--"));

  const force = flags.has("--force");
  const runAll = flags.has("--all");
  const requestedHelp = positionalArgs.some((arg) =>
    ["help", "--help", "-h"].includes(arg),
  );

  if (args.length === 0 || requestedHelp) {
    printHelp();
    process.exit(0);
  }

  const tableName = positionalArgs[0];
  if (tableName === "status") {
    await showStatus();
    return;
  }

  if (tableName === "all" || runAll) {
    const tablesToParse = TableNames.map((name) => name);
    await parseTables(tablesToParse, { force });
    return;
  }

  if (!tableName) {
    console.error("❌ No table specified");
    printHelp();
    process.exit(1);
  }

  await parseTable({
    tableName,
    force,
    onProgress: (_progress) => {
      // Progress is already logged in parseTable
    },
  });
}

async function showStatus() {
  const { getRawRowStore, getParsedRowStore } = await import(
    "#storage/row-store/factory"
  );
  const rawStore = getRawRowStore();
  const parsedStore = getParsedRowStore();

  console.log("📊 Parser Status\n");

  const [rawTables, parsedTables] = await Promise.all([
    rawStore.tableNames(),
    parsedStore.tableNames(),
  ]);

  const allTables = Array.from(new Set([...rawTables, ...parsedTables])).sort();

  if (allTables.length === 0) {
    console.log("⚠️  No tables found");
    return;
  }

  console.log(
    "Table".padEnd(35) + "Raw Rows".padEnd(15) + "Parsed Rows".padEnd(15) + "Status",
  );
  console.log("─".repeat(80));

  for (const table of allTables) {
    const [rawRows, parsedRows] = await Promise.all([
      rawStore.count(table),
      parsedStore.count(table),
    ]);

    let status: string;
    if (rawRows === 0) {
      status = "⚠️  No raw data";
    } else if (parsedRows === 0) {
      status = "❌ Not parsed";
    } else if (parsedRows < rawRows) {
      status = `⏳ Partial (${((parsedRows / rawRows) * 100).toFixed(0)}%)`;
    } else if (parsedRows >= rawRows) {
      status = "✅ Complete";
    } else {
      status = "⚠️  Mismatch";
    }

    console.log(
      table.padEnd(35) +
        rawRows.toLocaleString().padEnd(15) +
        parsedRows.toLocaleString().padEnd(15) +
        status,
    );
  }
  console.log();
}

function printHelp() {
  console.log(`
🔄 Eduskunta Data Pipeline - Parser

Usage:
  bun cli.ts <TableName>
  bun cli.ts all
  bun cli.ts status

Commands:
  <TableName>           Parse a specific table from raw to parsed stage
  all                   Parse all tables (same as --all flag)
  status                Show parsing status for all tables
  help                  Show this help message

Flags:
  --force               Re-parse rows that are already parsed
  --all                 Parse all tables (alternative to 'all' command)

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts all
  bun cli.ts all --force
  bun cli.ts status

How it works:
  - Reads raw data from raw.db (created by scraper)
  - Applies custom parser function if available (fn/<TableName>.ts)
  - Falls back to default parser if no custom parser exists
  - Writes parsed rows to parsed.db

Custom Parsers:
  Create fn/<TableName>.ts with a default export:

  export default async (row, primaryKey) => {
    // Transform row data
    return [identifier, transformedData];
  };

Environment Variables:
  ROW_STORE_DIR         Row-store directory (contains raw.db, parsed.db)
  STORAGE_LOCAL_DIR     Fallback directory if ROW_STORE_DIR is not set

Notes:
  - Parser reads from raw.db and writes to parsed.db
  - Processing is row-based with hash-skip for unchanged rows
  - Custom parsers allow for data transformation and cleanup
  - Default parser passes data through unchanged

For more information, see: shared/storage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

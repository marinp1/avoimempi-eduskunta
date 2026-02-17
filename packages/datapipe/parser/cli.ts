#!/usr/bin/env bun
import { parseTable, parseTables } from "./parser";
import { TableNames } from "#constants";

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

  if (runAll) {
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
  const { getStorage, listAllStorageKeys, StorageKeyBuilder } =
    await import("#storage");
  const storage = getStorage();

  console.log("📊 Parser Status\n");

  // Get all raw tables
  const rawPrefix = StorageKeyBuilder.listPrefixForStage("raw");
  const rawKeys = await listAllStorageKeys(storage, { prefix: rawPrefix });

  // Get all parsed tables
  const parsedPrefix = StorageKeyBuilder.listPrefixForStage("parsed");
  const parsedKeys = await listAllStorageKeys(storage, { prefix: parsedPrefix });

  // Extract table names and counts
  const rawTables = new Map<string, number>();
  const parsedTables = new Map<string, number>();

  for (const key of rawKeys) {
    const ref = StorageKeyBuilder.parseKey(key.key);
    if (ref) {
      rawTables.set(ref.table, (rawTables.get(ref.table) || 0) + 1);
    }
  }

  for (const key of parsedKeys) {
    const ref = StorageKeyBuilder.parseKey(key.key);
    if (ref) {
      parsedTables.set(ref.table, (parsedTables.get(ref.table) || 0) + 1);
    }
  }

  // Get all unique table names
  const allTables = new Set([...rawTables.keys(), ...parsedTables.keys()]);
  const sortedTables = Array.from(allTables).sort();

  if (sortedTables.length === 0) {
    console.log("⚠️  No tables found");
    return;
  }

  console.log(
    "Table".padEnd(35) +
      "Raw Pages".padEnd(15) +
      "Parsed Pages".padEnd(15) +
      "Status",
  );
  console.log("─".repeat(80));

  for (const table of sortedTables) {
    const rawPages = rawTables.get(table) || 0;
    const parsedPages = parsedTables.get(table) || 0;

    let status: string;
    if (rawPages === 0) {
      status = "⚠️  No raw data";
    } else if (parsedPages === 0) {
      status = "❌ Not parsed";
    } else if (parsedPages < rawPages) {
      status = `⏳ Partial (${((parsedPages / rawPages) * 100).toFixed(0)}%)`;
    } else if (parsedPages === rawPages) {
      status = "✅ Complete";
    } else {
      status = "⚠️  Mismatch";
    }

    console.log(
      table.padEnd(35) +
        rawPages.toString().padEnd(15) +
        parsedPages.toString().padEnd(15) +
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
  bun cli.ts status

Commands:
  <TableName>           Parse a specific table from raw to parsed stage
  status                Show parsing status for all tables
  help                  Show this help message

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts SaliDBAanestys
  bun cli.ts status

How it works:
  - Reads raw data from storage (created by scraper)
  - Applies custom parser function if available (fn/<TableName>.ts)
  - Falls back to default parser if no custom parser exists
  - Writes parsed data to storage in 'parsed' stage

Custom Parsers:
  Create fn/<TableName>.ts with a default export:

  export default async (row, primaryKey) => {
    // Transform row data
    return [identifier, transformedData];
  };

Environment Variables:
  STORAGE_PROVIDER      Storage backend (local, s3, r2, minio) [default: local]
  STORAGE_LOCAL_DIR     Local storage directory [default: ./data]

Notes:
  - Parser reads from 'raw' stage and writes to 'parsed' stage
  - Each page is processed independently
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

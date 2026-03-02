#!/usr/bin/env bun
import {
  ActivePipelineTableNames,
  isOmittedPipelineTable,
  OmittedPipelineTableNames,
} from "#constants";
import { getParsedRowStore, getRawRowStore } from "#storage/row-store/factory";
import { parseTable, parseTables } from "./parser";

async function main() {
  const args = process.argv.slice(2);
  const requestedHelp = args.some((arg) =>
    ["help", "--help", "-h"].includes(arg),
  );

  if (args.length === 0 || requestedHelp) {
    printHelp();
    process.exit(0);
  }

  const parsePk = (value: string | null, flagName: string): number => {
    const pk = Number.parseInt(value ?? "", 10);
    if (!Number.isFinite(pk) || pk < 0) {
      console.error(
        `❌ Error: ${flagName} value must be a non-negative integer`,
      );
      process.exit(1);
    }
    return Math.floor(pk);
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

  let force = false;
  let runAll = false;
  let pkStartValue: number | undefined;
  let pkEndValue: number | undefined;
  const positionalArgs: string[] = [];

  for (let i = 0; i < args.length; i++) {
    const rawArg = args[i];
    const flag = rawArg.split("=")[0];

    if (flag === "--force") {
      force = true;
      continue;
    }

    if (flag === "--all") {
      runAll = true;
      continue;
    }

    if (flag === "--pk-start" || flag === "--pk-end") {
      const { value, consumedNext } = readFlagValue(rawArg, i);
      if (consumedNext) i++;

      if (flag === "--pk-start") {
        pkStartValue = parsePk(value, flag);
      } else {
        pkEndValue = parsePk(value, flag);
      }
      continue;
    }

    if (rawArg.startsWith("-")) {
      console.error(`❌ Error: Unknown flag: ${rawArg}`);
      printHelp();
      process.exit(1);
    }

    positionalArgs.push(rawArg);
  }

  if (positionalArgs.length > 1) {
    console.error(`❌ Error: Unexpected argument '${positionalArgs[1]}'`);
    printHelp();
    process.exit(1);
  }

  if (pkEndValue !== undefined && pkStartValue === undefined) {
    console.error("❌ Error: --pk-end requires --pk-start");
    process.exit(1);
  }

  if (
    pkStartValue !== undefined &&
    pkEndValue !== undefined &&
    pkEndValue < pkStartValue
  ) {
    console.error(
      "❌ Error: --pk-end must be greater than or equal to --pk-start",
    );
    process.exit(1);
  }

  const tableName = positionalArgs[0];
  if (tableName === "status") {
    await showStatus();
    return;
  }

  if (tableName === "all" || runAll) {
    const tablesToParse = [...ActivePipelineTableNames];
    await parseTables(tablesToParse, { force, pkStartValue, pkEndValue });
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
    pkStartValue,
    pkEndValue,
    onProgress: (_progress) => {
      // Progress is already logged in parseTable
    },
  });
}

async function showStatus() {
  const rawStore = getRawRowStore();
  const parsedStore = getParsedRowStore();

  console.log("📊 Parser Status\n");

  const [rawTables, parsedTables] = await Promise.all([
    rawStore.tableNames(),
    parsedStore.tableNames(),
  ]);

  const allTables = Array.from(
    new Set([...ActivePipelineTableNames, ...rawTables, ...parsedTables]),
  )
    .filter((tableName) => !isOmittedPipelineTable(tableName))
    .sort();

  if (allTables.length === 0) {
    console.log("⚠️  No tables found");
    return;
  }

  console.log(
    "Table".padEnd(35) +
      "Raw Rows".padEnd(15) +
      "Parsed Rows".padEnd(15) +
      "Status",
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
  console.log(
    `🚫 Omitted from parser status: ${OmittedPipelineTableNames.join(", ")}`,
  );
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
  --pk-start <pk>       Parse only rows with PK >= <pk>
  --pk-end <pk>         Parse only rows with PK <= <pk> (requires --pk-start)

Examples:
  bun cli.ts MemberOfParliament
  bun cli.ts MemberOfParliament --pk-start 82310 --pk-end 82310
  bun cli.ts MemberOfParliament --pk-start 82000 --pk-end 83000
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
  - Omitted from status/all checks: ${OmittedPipelineTableNames.join(", ")}

For more information, see: shared/storage/README.md
`);
}

// Run CLI
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

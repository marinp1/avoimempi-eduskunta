#!/usr/bin/env bun
import fs from "node:fs";
import { getDatabasePath } from "#database";
import { getParsedRowStore } from "#storage/row-store/factory";
import { getLastMigrationTimestamp, runMigration } from "./migrate";

function printHelp() {
  console.log(`
🧱 Eduskunta Data Pipeline - Migrator

Usage:
  bun cli.ts
  bun cli.ts start
  bun cli.ts start --fresh
  bun cli.ts start --force
  bun cli.ts recreate
  bun cli.ts status
  bun cli.ts help

Commands:
  start                 Rebuild database from parsed data (default)
  recreate              Delete DB files and rebuild from parsed data
  status                Show migrator status and last migration timestamp
  help                  Show this help message

Flags:
  --fresh               Delete existing DB files before migrating
  --force               Skip change-detection and always re-run migration

Examples:
  bun cli.ts
  bun cli.ts start
  bun cli.ts start --fresh
  bun cli.ts start --force
  bun cli.ts recreate
  bun cli.ts status

How it works:
  - Runs SQL migrations from packages/datapipe/migrator/migrations
  - Clears target database tables
  - Imports parsed data from storage using table migrators
  - Publishes latest SQLite artifact to storage (artifacts/sqlite/latest)
  - Optionally publishes per-run snapshot (MIGRATOR_PUBLISH_SNAPSHOT=true)
  - Optional non-blocking FK report (MIGRATOR_FOREIGN_KEY_CHECK=true)
  - Stores last migration timestamp in _migration_info
`);
}

function showStatus() {
  const lastMigration = getLastMigrationTimestamp();

  console.log("📊 Migrator Status\n");
  console.log(`Last migration: ${lastMigration ?? "-"}`);
}

async function hasAnyParsedData(): Promise<boolean> {
  // Parsed row store is the source of truth for all tables (including VaskiData).
  const parsedStore = getParsedRowStore();
  const tables = await parsedStore.tableNames();
  return tables.length > 0;
}

function recreateDatabaseFiles() {
  const databasePath = getDatabasePath();
  const candidates = [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
  ];
  let removed = 0;

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    fs.rmSync(filePath, { force: true });
    removed++;
    console.log(`🗑️  Removed ${filePath}`);
  }

  if (removed === 0) {
    console.log("ℹ️  No existing database files found, creating from scratch.");
  }
}

async function runMigrationCommand(options?: {
  fresh?: boolean;
  force?: boolean;
}) {
  if (options?.fresh) {
    const hasParsedData = await hasAnyParsedData();
    if (!hasParsedData) {
      throw new Error(
        "No parsed data found. Refusing fresh recreate to avoid deleting DB without import source.",
      );
    }
    recreateDatabaseFiles();
  }

  console.log("🚀 Starting migration...");
  await runMigration({ force: options?.force });
  console.log("✅ Migration completed");
}

async function main() {
  const rawArgs = process.argv.slice(2);
  if (
    rawArgs.includes("help") ||
    rawArgs.includes("--help") ||
    rawArgs.includes("-h")
  ) {
    printHelp();
    return;
  }

  const fresh = rawArgs.includes("--fresh");
  const force = rawArgs.includes("--force");
  const args = rawArgs.filter((arg) => arg !== "--fresh" && arg !== "--force");
  const command = args[0] ?? "start";

  if (command === "status") {
    showStatus();
    return;
  }

  if (command === "start") {
    await runMigrationCommand({ fresh, force });
    return;
  }

  if (command === "recreate") {
    await runMigrationCommand({ fresh: true, force });
    return;
  }

  console.error(`❌ Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});

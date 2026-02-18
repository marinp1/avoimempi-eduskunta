#!/usr/bin/env bun
import fs from "node:fs";
import { getDatabasePath } from "#database";
import { getStorage, StorageKeyBuilder } from "#storage";
import { MigratorController } from "../../server/migrator-controller";

function printHelp() {
  console.log(`
🧱 Eduskunta Data Pipeline - Migrator

Usage:
  bun cli.ts
  bun cli.ts start
  bun cli.ts start --fresh
  bun cli.ts recreate
  bun cli.ts status
  bun cli.ts help

Commands:
  start                 Rebuild database from parsed data (default)
  recreate              Delete DB files and rebuild from parsed data
  status                Show migrator status and last migration timestamp
  help                  Show this help message

Examples:
  bun cli.ts
  bun cli.ts start
  bun cli.ts start --fresh
  bun cli.ts recreate
  bun cli.ts status

How it works:
  - Runs SQL migrations from packages/datapipe/migrator/migrations
  - Clears target database tables
  - Imports parsed data from storage using table migrators
  - Publishes latest SQLite artifact to storage (artifacts/sqlite/latest)
  - Stores last migration timestamp in _migration_info
`);
}

function showStatus() {
  const status = MigratorController.getInstance().getStatus();
  const lastMigration = MigratorController.getLastMigrationTimestamp();

  console.log("📊 Migrator Status\n");
  console.log(`Running: ${status.isRunning ? "yes" : "no"}`);
  console.log(`Current table: ${status.currentTable ?? "-"}`);
  console.log(`Last migration: ${lastMigration ?? "-"}`);
}

async function hasAnyParsedData(): Promise<boolean> {
  const storage = getStorage();
  const parsedPrefix = StorageKeyBuilder.listPrefixForStage("parsed");
  const result = await storage.list({ prefix: parsedPrefix, maxKeys: 1 });
  return result.keys.length > 0;
}

function recreateDatabaseFiles() {
  const databasePath = getDatabasePath();
  const candidates = [databasePath, `${databasePath}-wal`, `${databasePath}-shm`];
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

async function runMigration(options?: { fresh?: boolean }) {
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
  await MigratorController.getInstance().startMigration();
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
  const args = rawArgs.filter((arg) => arg !== "--fresh");
  const command = args[0] ?? "start";

  if (command === "status") {
    showStatus();
    return;
  }

  if (command === "start") {
    await runMigration({ fresh });
    return;
  }

  if (command === "recreate") {
    await runMigration({ fresh: true });
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

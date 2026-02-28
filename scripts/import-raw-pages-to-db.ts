#!/usr/bin/env bun
/**
 * One-shot migration: import existing raw page files into data/raw.db.
 *
 * Each page file (data/raw/{TableName}/page_*.json) contains:
 *   { tableName, pkName, columnNames, rowData: string[][] }
 *
 * Each rowData entry is an ordered values array (same order as columnNames).
 * The PK value sits at the index of pkName within columnNames.
 *
 * Usage:
 *   bun scripts/import-raw-pages-to-db.ts [--dry-run] [TableName ...]
 *
 * Options:
 *   --dry-run   Scan and report without writing to the DB
 *   TableName   Optional list of tables to import (default: all)
 *
 */

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { getStorageConfig } from "../packages/shared/storage/config";
import { SqliteRowStore } from "../packages/shared/storage/row-store/providers/sqlite";

const PAGE_FILE_RE = /^page_(\d+)\+(\d+)\.json$/i;
const BATCH_SIZE = 500; // rows flushed per upsertBatch call

interface RawPageFile {
  tableName: string;
  pkName: string;
  columnNames: string[];
  rowData: string[][];
}

function parsePage(raw: unknown): RawPageFile | null {
  if (typeof raw !== "object" || raw === null) return null;
  const p = raw as Record<string, unknown>;
  if (
    typeof p.tableName !== "string" ||
    typeof p.pkName !== "string" ||
    !Array.isArray(p.columnNames) ||
    !Array.isArray(p.rowData)
  ) {
    return null;
  }
  return {
    tableName: p.tableName as string,
    pkName: p.pkName as string,
    columnNames: p.columnNames as string[],
    rowData: p.rowData as string[][],
  };
}

async function getTableDirs(rawDir: string): Promise<string[]> {
  const entries = await readdir(rawDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
}

async function getPageFiles(tableDir: string): Promise<string[]> {
  const entries = await readdir(tableDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile() && PAGE_FILE_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

async function importTable(
  rawDb: SqliteRowStore,
  tableDir: string,
  tableName: string,
  dryRun: boolean,
): Promise<{ pages: number; rows: number; errors: number }> {
  const pageFiles = await getPageFiles(tableDir);
  let totalRows = 0;
  let errors = 0;

  for (const pageFile of pageFiles) {
    const filePath = path.join(tableDir, pageFile);
    let payload: RawPageFile | null = null;

    try {
      const content = await readFile(filePath, "utf8");
      payload = parsePage(JSON.parse(content));
    } catch (err) {
      console.error(`  ✗ Failed to read ${pageFile}: ${err}`);
      errors++;
      continue;
    }

    if (!payload) {
      console.error(`  ✗ Invalid page format: ${pageFile}`);
      errors++;
      continue;
    }

    const pkIndex = payload.columnNames.indexOf(payload.pkName);
    if (pkIndex === -1) {
      console.error(
        `  ✗ pkName "${payload.pkName}" not in columnNames for ${pageFile}`,
      );
      errors++;
      continue;
    }

    const rows: Array<{ pk: number; data: string }> = [];

    for (const valueArr of payload.rowData) {
      const pkRaw = valueArr[pkIndex];
      const pk = Number.parseInt(String(pkRaw), 10);
      if (!Number.isFinite(pk)) {
        errors++;
        continue;
      }
      rows.push({ pk, data: JSON.stringify(valueArr) });
    }

    if (rows.length === 0) continue;

    // Flush in chunks so single-transaction size stays reasonable
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const chunk = rows.slice(i, i + BATCH_SIZE);
      if (!dryRun) {
        await rawDb.upsertBatch(
          payload.tableName,
          payload.pkName,
          payload.columnNames,
          chunk,
        );
      }
      totalRows += chunk.length;
    }
  }

  return { pages: pageFiles.length, rows: totalRows, errors };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.includes("--help") || args.includes("-h") || args.includes("help")) {
    console.log(`
One-shot migration: import existing raw page files into data/raw.db.

Usage:
  bun scripts/import-raw-pages-to-db.ts [--dry-run] [TableName ...]

Options:
  --dry-run   Scan and report without writing to the DB
  --help      Show this help message
  TableName   Optional list of tables to import (default: all)
`);
    process.exit(0);
  }

  const dryRun = args.includes("--dry-run");
  const requestedTables = args.filter((a) => !a.startsWith("--"));

  const cfg = getStorageConfig();
  const rawDir = path.join(cfg.local.baseDir, "raw");
  const dbPath = path.join(cfg.local.baseDir, "raw.db");

  console.log(`📂 Raw data dir : ${rawDir}`);
  console.log(`🗄️  Target DB    : ${dbPath}`);
  if (dryRun) console.log("🔍 DRY RUN — no writes will happen\n");
  else console.log();

  let allTableDirs: string[];
  try {
    allTableDirs = await getTableDirs(rawDir);
  } catch {
    console.error(`❌ Could not read raw directory: ${rawDir}`);
    process.exit(1);
  }

  const tableDirs =
    requestedTables.length > 0
      ? allTableDirs.filter((t) => requestedTables.includes(t))
      : allTableDirs;

  if (tableDirs.length === 0) {
    console.error("❌ No matching tables found.");
    process.exit(1);
  }

  const rawDb = new SqliteRowStore(dbPath, "raw");

  let grandTotal = { pages: 0, rows: 0, errors: 0 };

  for (const tableName of tableDirs) {
    const tableDir = path.join(rawDir, tableName);
    process.stdout.write(`  ${tableName} … `);

    const result = await importTable(rawDb, tableDir, tableName, dryRun);
    grandTotal.pages += result.pages;
    grandTotal.rows += result.rows;
    grandTotal.errors += result.errors;

    const errStr = result.errors > 0 ? `, ${result.errors} errors` : "";
    console.log(
      `${result.pages} pages, ${result.rows.toLocaleString()} rows${errStr}`,
    );
  }

  rawDb.close();

  console.log();
  console.log("─".repeat(50));
  console.log(
    `✅ Done: ${tableDirs.length} tables, ${grandTotal.pages} pages, ${grandTotal.rows.toLocaleString()} rows imported`,
  );
  if (grandTotal.errors > 0) {
    console.log(`⚠️  ${grandTotal.errors} errors encountered`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("❌ Fatal:", err);
  process.exit(1);
});

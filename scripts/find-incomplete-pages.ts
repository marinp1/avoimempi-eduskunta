#!/usr/bin/env bun

/**
 * Find all JSON files in data/raw that don't have "rowCount": 100
 *
 * This script scans the raw data directory and identifies pages that may be
 * incomplete or represent the last page of a table's data.
 *
 * Uses the storage abstraction layer for cloud-agnostic access.
 */

import {
  getStorage,
  StorageKeyBuilder,
} from "../packages/shared/storage/index.ts";

interface RawDataPage {
  rowCount?: number;
  [key: string]: any;
}

interface IncompletePageInfo {
  tableName: string;
  fileName: string;
  storageKey: string;
  rowCount: number | null;
}

async function findIncompletePages(): Promise<IncompletePageInfo[]> {
  const incompletePages: IncompletePageInfo[] = [];
  const storage = getStorage();

  try {
    // List all files in the raw stage
    // Use a very large maxKeys to get all files at once (local filesystem doesn't have true pagination)
    const prefix = StorageKeyBuilder.listPrefixForStage("raw");
    const result = await storage.list({
      prefix,
      maxKeys: 1000000, // Set to a very large number to get all files
    });

    // Group keys by table to show progress
    const keysByTable = new Map<string, string[]>();
    for (const metadata of result.keys) {
      const parsed = StorageKeyBuilder.parseKey(metadata.key);
      if (!parsed) continue;

      const keys = keysByTable.get(parsed.table) || [];
      keys.push(metadata.key);
      keysByTable.set(parsed.table, keys);
    }

    console.log(
      `Found ${keysByTable.size} tables with ${result.keys.length} total files\n`,
    );

    // Process each file
    let processed = 0;
    for (const metadata of result.keys) {
      const parsed = StorageKeyBuilder.parseKey(metadata.key);
      if (!parsed) {
        console.warn(`Skipping invalid key format: ${metadata.key}`);
        continue;
      }

      try {
        const content = await storage.get(metadata.key);
        if (!content) {
          console.error(`Error: Could not read ${metadata.key}`);
          continue;
        }

        const data: RawDataPage = JSON.parse(content);

        // Check if rowCount is not 100
        if (data.rowCount !== 100) {
          incompletePages.push({
            tableName: parsed.table,
            fileName: metadata.key.split("/").pop()!,
            storageKey: metadata.key,
            rowCount: data.rowCount ?? null,
          });
        }

        processed++;
        if (processed % 1000 === 0) {
          console.log(`Processed ${processed}/${result.keys.length} files...`);
        }
      } catch (error) {
        console.error(`Error reading ${metadata.key}:`, error);
      }
    }

    console.log(`\nFinished processing ${processed} files\n`);
  } catch (error) {
    console.error("Error scanning raw data storage:", error);
    process.exit(1);
  }

  return incompletePages;
}

async function main() {
  console.log("Scanning for incomplete pages in data/raw...\n");

  const incompletePages = await findIncompletePages();

  if (incompletePages.length === 0) {
    console.log("✓ All pages have rowCount: 100");
    return;
  }

  // Group by table name
  const byTable = incompletePages.reduce(
    (acc, page) => {
      if (!acc[page.tableName]) {
        acc[page.tableName] = [];
      }
      acc[page.tableName].push(page);
      return acc;
    },
    {} as Record<string, IncompletePageInfo[]>,
  );

  console.log(`Found ${incompletePages.length} incomplete pages:\n`);

  // Print grouped by table
  for (const [tableName, pages] of Object.entries(byTable)) {
    console.log(`${tableName} (${pages.length} files):`);

    // Sort by file name
    pages.sort((a, b) => a.fileName.localeCompare(b.fileName));

    for (const page of pages) {
      const rowCountDisplay = page.rowCount !== null ? page.rowCount : "null";
      console.log(`  - ${page.fileName}: rowCount = ${rowCountDisplay}`);
    }
    console.log();
  }

  // Summary
  console.log("Summary:");
  for (const [tableName, pages] of Object.entries(byTable)) {
    console.log(`  ${tableName}: ${pages.length} incomplete page(s)`);
  }
}

main();

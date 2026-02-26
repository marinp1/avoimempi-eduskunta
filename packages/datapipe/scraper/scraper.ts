import { scheduler } from "node:timers/promises";
import type { DataStage } from "#storage";
import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";
import { recordSourceStagePage } from "#storage/source-status";
import { getExactTableCountByRows } from "#table-counts";

/** Time to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 25;

/** At most make these many requests to avoid infinite call loops. */
const MAX_LOOP_LIMIT = 10_000; // Meaning ~ 1,000,000 rows

/**
 * API Response structure from Eduskunta API
 */
interface EduskuntaApiResponse {
  columnNames: string[];
  pkName: string;
  pkLastValue: number | null;
  rowData: any[][];
  rowCount: number;
  hasMore: boolean;
  source?: {
    tableName: string;
    firstPk: number;
    lastPk: number;
    scrapedAt: string;
  };
}

/**
 * Get column information for a table
 */
async function getTableColumns(tableName: string) {
  const resp = await fetch(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/columns`,
  );
  const { pkName, columnNames } = (await resp.json()) as {
    pkName: string;
    columnNames: string[];
  };
  return {
    primaryColumn: pkName,
    otherColumns: columnNames.filter((v) => v !== pkName),
  };
}

/**
 * Get info about the last scraped page (highest lastPk) for a table.
 * Returns null if no pages exist yet.
 */
async function getLastScrapedPageRef(
  storage: ReturnType<typeof getStorage>,
  tableName: string,
  stage: DataStage,
): Promise<{
  key: string;
  firstPk: number;
  lastPk: number;
  pageCount: number;
} | null> {
  const prefix = StorageKeyBuilder.listPrefixForTable(stage, tableName);
  const keys = await listAllStorageKeys(storage, {
    prefix,
    pageSize: 10_000,
  });

  if (keys.length === 0) return null;

  const refs = keys
    .map((k) => ({ key: k.key, ref: StorageKeyBuilder.parseKey(k.key) }))
    .filter(
      (
        r,
      ): r is {
        key: string;
        ref: NonNullable<ReturnType<typeof StorageKeyBuilder.parseKey>>;
      } => r.ref !== null,
    );

  if (refs.length === 0) return null;

  const last = refs.reduce((max, curr) =>
    curr.ref.lastPk > max.ref.lastPk ? curr : max,
  );

  return {
    key: last.key,
    firstPk: last.ref.firstPk,
    lastPk: last.ref.lastPk,
    pageCount: refs.length,
  };
}

/**
 * Scrape modes
 */
export type ScrapeMode =
  | { type: "auto-resume" }
  | { type: "start-from-pk"; pkStartValue: number }
  | { type: "patch-from-pk"; pkStartValue: number };

/**
 * Scrape options
 */
export interface ScrapeOptions {
  tableName: string;
  mode?: ScrapeMode;
  stage?: DataStage;
  onProgress?: (progress: {
    page: number;
    rowCount: number;
    totalRows: number;
    percentComplete: number;
  }) => void;
}

/**
 * Scrape a table from Eduskunta API and save to storage
 */
export async function scrapeTable(options: ScrapeOptions): Promise<void> {
  const {
    tableName,
    mode = { type: "auto-resume" },
    stage = "raw",
    onProgress,
  } = options;

  const storage = getStorage();

  console.log(`\n📥 Scraping table: ${tableName}`);
  console.log(`📁 Storage: ${storage.name}`);
  console.log(`📊 Stage: ${stage}`);

  // Get table metadata
  const { primaryColumn } = await getTableColumns(tableName);
  const totalRows = await getExactTableCountByRows(tableName);

  console.log(`📋 Total rows in API: ${totalRows.toLocaleString()}`);

  let pkStartValue: number;
  let patchMode = false;
  let patchFollowUpDone = false;
  let internalPageCounter = 1;
  let totalRowsScraped = 0;

  const formatPercent = (value: number): string => {
    if (value >= 100) return "100.0";
    return Math.min(value, 99.9).toFixed(1);
  };

  switch (mode.type) {
    case "auto-resume": {
      const lastPage = await getLastScrapedPageRef(storage, tableName, stage);
      if (lastPage) {
        // Delete the last page file — it will be re-scraped (may have been incomplete)
        await storage.delete(lastPage.key);
        pkStartValue = lastPage.firstPk;
        internalPageCounter = lastPage.pageCount; // start counter where we left off
        totalRowsScraped = (lastPage.pageCount - 1) * 100; // estimate from complete pages
        console.log(
          `✅ Already scraped: ${lastPage.pageCount - 1} pages (complete)`,
        );
        console.log(`🔄 Re-scraping last page from PK: ${pkStartValue}`);
        if (totalRowsScraped > 0) {
          const percentComplete =
            totalRows > 0
              ? Math.min((totalRowsScraped / totalRows) * 100, 100)
              : 0;
          console.log(
            `📊 Already scraped: ~${totalRowsScraped.toLocaleString()} rows (${formatPercent(percentComplete)}%)`,
          );
        }
      } else {
        pkStartValue = 0;
        console.log(`🚀 Starting fresh`);
      }
      break;
    }

    case "start-from-pk":
      pkStartValue = mode.pkStartValue;
      console.log(
        `🚀 Starting from PK: ${pkStartValue} (will continue until end)`,
      );
      break;

    case "patch-from-pk":
      pkStartValue = mode.pkStartValue;
      patchMode = true;
      console.log(
        `🩹 Patch mode from PK: ${pkStartValue} (scrapes patch page + 1 follow-up page)`,
      );
      break;
  }

  console.log();

  const baseUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`,
  );
  baseUrl.searchParams.set("pkName", primaryColumn);
  baseUrl.searchParams.set("perPage", "100");

  let loopCount = 0;
  let rowsScrapedThisRun = 0;
  let pagesScrapedThisRun = 0;

  do {
    if (loopCount >= MAX_LOOP_LIMIT) {
      console.error("⚠️  Reached maximum loop limit!");
      throw new Error("Sanity check error: MAX_LOOP_LIMIT reached");
    }

    // Update URL with current pkStartValue
    baseUrl.searchParams.set("pkStartValue", String(pkStartValue));

    console.log(`📡 Fetching batch from PK ${pkStartValue}...`);

    // Fetch from API
    const response = await fetch(baseUrl.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = (await response.json()) as EduskuntaApiResponse;

    if (content.rowCount === 0) {
      console.log("✅ No more data to scrape");
      break;
    }

    // Extract actual first and last PK from row data
    const indexOfPrimaryKey = content.columnNames.indexOf(primaryColumn);
    const firstRowPkRaw = content.rowData[0][indexOfPrimaryKey];
    const lastRowPkRaw =
      content.rowData[content.rowData.length - 1][indexOfPrimaryKey];
    const firstPk =
      typeof firstRowPkRaw === "string"
        ? parseInt(firstRowPkRaw, 10)
        : (firstRowPkRaw as number);
    const lastPk =
      content.pkLastValue !== null
        ? content.pkLastValue
        : typeof lastRowPkRaw === "string"
          ? parseInt(lastRowPkRaw, 10)
          : (lastRowPkRaw as number);

    // Save page to storage with PK-range filename.
    // Before writing, delete any existing file for the same firstPk but a different lastPk.
    // This handles the case where a mid-dataset gap closes: the page range shrinks (e.g.
    // old file covered PKs 100-299, new fetch returns PKs 100-199), so the new file gets
    // a different name and both would otherwise coexist — causing duplicates downstream.
    const existingKeysForRange = await listAllStorageKeys(storage, {
      prefix: StorageKeyBuilder.listPrefixForTable(stage, tableName),
      pageSize: 10_000,
    });
    for (const existing of existingKeysForRange) {
      const existingRef = StorageKeyBuilder.parseKey(existing.key);
      if (
        existingRef &&
        existingRef.firstPk === firstPk &&
        existingRef.lastPk !== lastPk
      ) {
        console.log(
          `🗑️  Deleting stale page (firstPk=${firstPk}, old lastPk=${existingRef.lastPk}, new lastPk=${lastPk})`,
        );
        await storage.delete(existing.key);
      }
    }
    const key = StorageKeyBuilder.forPkRange(stage, tableName, firstPk, lastPk);
    const contentWithSource: EduskuntaApiResponse = {
      ...content,
      source: {
        tableName,
        firstPk,
        lastPk,
        scrapedAt: new Date().toISOString(),
      },
    };
    const data = JSON.stringify(contentWithSource, null, 2);
    await storage.put(key, data);
    await recordSourceStagePage(
      tableName,
      stage,
      internalPageCounter,
      content.rowCount,
    );

    totalRowsScraped += content.rowCount;
    rowsScrapedThisRun += content.rowCount;
    pagesScrapedThisRun++;

    // Dynamically adjust total if we've exceeded the API's initial estimate
    const adjustedTotal = Math.max(totalRows, totalRowsScraped);
    const percentComplete =
      adjustedTotal > 0
        ? Math.min((totalRowsScraped / adjustedTotal) * 100, 100)
        : 0;

    console.log(
      `✅ Saved page_${String(firstPk).padStart(12, "0")}+${String(lastPk).padStart(12, "0")} (${content.rowCount} rows) - ${formatPercent(percentComplete)}% complete`,
    );

    // Call progress callback
    if (onProgress) {
      onProgress({
        page: internalPageCounter,
        rowCount: content.rowCount,
        totalRows: totalRowsScraped,
        percentComplete,
      });
    }

    // Patch mode: after writing each page, delete subsumed pages (firstPk within the
    // just-written range), then stop after the follow-up page.
    if (patchMode) {
      // Delete existing pages whose firstPk falls strictly within (firstPk, lastPk].
      // Those pages were part of the gap that this patch fills; they are now subsumed.
      for (const existing of existingKeysForRange) {
        const existingRef = StorageKeyBuilder.parseKey(existing.key);
        if (
          existingRef &&
          existingRef.firstPk > firstPk &&
          existingRef.firstPk <= lastPk
        ) {
          console.log(
            `🗑️  Deleting subsumed page (firstPk=${existingRef.firstPk}, lastPk=${existingRef.lastPk})`,
          );
          await storage.delete(existing.key);
        }
      }

      if (patchFollowUpDone) {
        // We just finished the follow-up page — stop.
        console.log("✅ Patch complete (patch page + follow-up page scraped)");
        break;
      }

      // Mark that the next page is the follow-up page.
      patchFollowUpDone = true;
    }

    // Check if there's more data
    if (!content.hasMore) {
      console.log("✅ Reached end of data");
      break;
    }

    // Wait before next call
    await scheduler.wait(TIME_BETWEEN_QUERIES);

    // Update pkStartValue for next iteration
    if (content.pkLastValue !== null) {
      pkStartValue = content.pkLastValue + 1;
    } else {
      const lastRow = content.rowData[content.rowData.length - 1];
      if (lastRow && lastRow[indexOfPrimaryKey] !== undefined) {
        const lastPkValue = lastRow[indexOfPrimaryKey];
        pkStartValue =
          (typeof lastPkValue === "string"
            ? parseInt(lastPkValue, 10)
            : lastPkValue) + 1;
      } else {
        console.error("❌ Could not determine next primary key value");
        break;
      }
    }

    internalPageCounter++;
    loopCount++;
  } while (true);

  console.log(`\n✅ Scraping complete for ${tableName}`);
  console.log(`📊 Pages scraped in this run: ${pagesScrapedThisRun}`);
  console.log(
    `📊 Rows scraped in this run: ${rowsScrapedThisRun.toLocaleString()}`,
  );
  console.log(
    `📊 Total rows currently stored: ${totalRowsScraped.toLocaleString()}`,
  );

  if (totalRows > 0 && totalRowsScraped !== totalRows) {
    const diff = totalRows - totalRowsScraped;
    const relation = diff > 0 ? "less" : "more";
    console.warn(
      `⚠️  Stored rows (${totalRowsScraped.toLocaleString()}) differ from API counts (${totalRows.toLocaleString()}) by ${Math.abs(diff).toLocaleString()} (${relation} than API count).`,
    );
  }
}

/**
 * Scrape multiple tables
 */
export async function scrapeTables(
  tableNames: string[],
  options?: Omit<ScrapeOptions, "tableName">,
): Promise<void> {
  for (const tableName of tableNames) {
    try {
      await scrapeTable({ ...options, tableName });
    } catch (error) {
      console.error(`❌ Error scraping ${tableName}:`, error);
      // Continue with next table
    }
  }
}

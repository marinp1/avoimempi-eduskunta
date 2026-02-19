import { scheduler } from "node:timers/promises";
import type { DataStage } from "#storage";
import { recordSourceStagePage } from "#storage/source-status";
import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";
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
 * Get the last page number scraped for a table
 */
async function getLastScrapedPage(
  storage: ReturnType<typeof getStorage>,
  tableName: string,
  stage: DataStage,
): Promise<number> {
  const prefix = StorageKeyBuilder.listPrefixForTable(stage, tableName);
  const keys = await listAllStorageKeys(storage, {
    prefix,
    pageSize: 10_000,
  });

  if (keys.length === 0) {
    return 0;
  }

  // Parse page numbers from keys
  const pageNumbers = keys
    .map((key) => StorageKeyBuilder.parseKey(key.key))
    .filter((ref) => ref !== null)
    .map((ref) => ref?.page);

  return pageNumbers.length > 0 ? Math.max(...pageNumbers) : 0;
}

/**
 * Scrape modes
 */
export type ScrapeMode =
  | { type: "auto-resume" }
  | { type: "start-from"; page: number }
  | { type: "single-page"; page: number };

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

  // Determine starting page based on mode
  const lastScrapedPage = await getLastScrapedPage(storage, tableName, stage);

  let startPage: number;
  let singlePageMode = false;

  switch (mode.type) {
    case "auto-resume":
      // Always re-scrape the last page in case it was incomplete
      startPage = lastScrapedPage > 0 ? lastScrapedPage : 1;
      if (lastScrapedPage > 0) {
        console.log(
          `✅ Already scraped: ${lastScrapedPage - 1} pages (complete)`,
        );
        console.log(
          `🔄 Re-scraping last page and continuing from page: ${startPage}`,
        );
      } else {
        console.log(`🚀 Starting fresh from page: ${startPage}`);
      }
      break;

    case "start-from":
      startPage = mode.page;
      console.log(
        `🚀 Starting from page: ${startPage} (will continue until end)`,
      );
      break;

    case "single-page":
      startPage = mode.page;
      singlePageMode = true;
      console.log(`📄 Scraping single page: ${startPage}`);
      break;
  }

  console.log();

  let currentPage = startPage;
  let loopCount = 0;
  let rowsScrapedThisRun = 0;

  const formatPercent = (value: number): string => {
    if (value >= 100) return "100.0";
    return Math.min(value, 99.9).toFixed(1);
  };

  // Calculate total rows already scraped (for progress calculation)
  // Since we re-scrape the last page, count only complete pages (startPage - 1)
  let totalRowsScraped = 0;

  if (startPage > 1) {
    // Calculate rows from complete pages only (excluding the last page we're re-scraping)
    const completePageCount = startPage - 1;

    if (completePageCount > 0) {
      // Read the page before the one we're re-scraping to get exact row count
      const lastCompletePageKey = StorageKeyBuilder.forPage(
        stage,
        tableName,
        completePageCount,
      );
      const lastCompletePageData = await storage.get(lastCompletePageKey);

      if (lastCompletePageData) {
        try {
          const lastCompletePageContent = JSON.parse(
            lastCompletePageData,
          ) as EduskuntaApiResponse;
          // (n-1) pages with 100 rows + last complete page's actual row count
          totalRowsScraped =
            (completePageCount - 1) * 100 + lastCompletePageContent.rowCount;
        } catch (_error) {
          console.warn(
            `⚠️  Could not read page ${completePageCount} for progress calculation`,
          );
          // Fallback: assume all pages have 100 rows
          totalRowsScraped = completePageCount * 100;
        }
      } else {
        // Fallback: assume all pages have 100 rows
        totalRowsScraped = completePageCount * 100;
      }
    }

    if (totalRowsScraped > 0) {
      const percentComplete =
        totalRows > 0 ? Math.min((totalRowsScraped / totalRows) * 100, 100) : 0;
      console.log(
        `📊 Already scraped: ${totalRowsScraped.toLocaleString()} rows (${formatPercent(percentComplete)}%)`,
      );
    }
  }

  // Determine starting primary key value
  let pkStartValue: number;

  if (startPage === 1) {
    // Starting from beginning
    pkStartValue = 0;
  } else {
    // Need to read the last primary key from the previous page
    const prevPage = startPage - 1;
    const prevPageKey = StorageKeyBuilder.forPage(stage, tableName, prevPage);
    const prevPageData = await storage.get(prevPageKey);

    if (!prevPageData) {
      console.error(
        `⚠️  Cannot find page ${prevPage}, required to start from page ${startPage}`,
      );
      console.error(`⚠️  Please scrape from page 1 or use auto-resume mode`);
      throw new Error(
        `Missing page ${prevPage} - cannot determine starting primary key`,
      );
    }

    const prevContent = JSON.parse(prevPageData) as EduskuntaApiResponse;

    if (prevContent.pkLastValue !== null) {
      pkStartValue = prevContent.pkLastValue + 1;
    } else {
      // Fallback: use last row's primary key
      const indexOfPrimaryKey = prevContent.columnNames.indexOf(primaryColumn);
      const lastRow = prevContent.rowData[prevContent.rowData.length - 1];
      if (lastRow && lastRow[indexOfPrimaryKey] !== undefined) {
        // Convert to number if it's a string, then add 1
        const lastPkValue = lastRow[indexOfPrimaryKey];
        pkStartValue =
          (typeof lastPkValue === "string"
            ? parseInt(lastPkValue, 10)
            : lastPkValue) + 1;
      } else {
        throw new Error(`Cannot determine primary key from page ${prevPage}`);
      }
    }

    console.log(
      `📌 Starting from primary key: ${pkStartValue} (from previous page)`,
    );
  }

  const baseUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`,
  );
  baseUrl.searchParams.set("pkName", primaryColumn);
  baseUrl.searchParams.set("perPage", "100");

  do {
    if (loopCount >= MAX_LOOP_LIMIT) {
      console.error("⚠️  Reached maximum loop limit!");
      throw new Error("Sanity check error: MAX_LOOP_LIMIT reached");
    }

    // Update URL with current pkStartValue
    baseUrl.searchParams.set("pkStartValue", String(pkStartValue));

    console.log(`📡 Fetching page ${currentPage} (pk=${pkStartValue})...`);

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

    // Save page to storage
    const key = StorageKeyBuilder.forPage(stage, tableName, currentPage);
    const data = JSON.stringify(content, null, 2);
    await storage.put(key, data);
    await recordSourceStagePage(tableName, stage, currentPage, content.rowCount);

    totalRowsScraped += content.rowCount;
    rowsScrapedThisRun += content.rowCount;

    // Dynamically adjust total if we've exceeded the API's initial estimate
    // This handles cases where the API count is stale
    const adjustedTotal = Math.max(totalRows, totalRowsScraped);
    const percentComplete =
      adjustedTotal > 0
        ? Math.min((totalRowsScraped / adjustedTotal) * 100, 100)
        : 0;

    console.log(
      `✅ Saved page ${currentPage} (${content.rowCount} rows) - ${formatPercent(percentComplete)}% complete`,
    );

    // Call progress callback
    if (onProgress) {
      onProgress({
        page: currentPage,
        rowCount: content.rowCount,
        totalRows: totalRowsScraped,
        percentComplete,
      });
    }

    // Stop if in single-page mode
    if (singlePageMode) {
      console.log("✅ Single page scraping complete");
      break;
    }

    // Check if there's more data
    if (!content.hasMore) {
      console.log("✅ Reached end of data");
      break;
    }

    // Wait before next call
    await scheduler.wait(TIME_BETWEEN_QUERIES);

    // Update for next iteration
    if (content.pkLastValue !== null) {
      pkStartValue = content.pkLastValue + 1;
    } else {
      // Fallback: use last row's primary key
      const indexOfPrimaryKey = content.columnNames.indexOf(primaryColumn);
      const lastRow = content.rowData[content.rowData.length - 1];
      if (lastRow && lastRow[indexOfPrimaryKey] !== undefined) {
        // Convert to number if it's a string, then add 1
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

    currentPage++;
    loopCount++;
  } while (true);

  console.log(`\n✅ Scraping complete for ${tableName}`);
  console.log(`📊 Total pages scraped: ${currentPage - startPage + 1}`);
  console.log(`📊 Rows scraped in this run: ${rowsScrapedThisRun.toLocaleString()}`);
  console.log(`📊 Total rows currently stored: ${totalRowsScraped.toLocaleString()}`);

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

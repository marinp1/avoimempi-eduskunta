import { scheduler } from "node:timers/promises";
import { getStorage, StorageKeyBuilder } from "../../shared/storage";
import type { DataStage } from "../../shared/storage";

/** Time to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 10;

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
 * Get table row counts from API
 */
async function getTableCounts(): Promise<Record<string, number>> {
  const resp = await fetch(
    "https://avoindata.eduskunta.fi/api/v1/tables/counts"
  );
  const data = (await resp.json()) as {
    tableName: string;
    rowCount: number;
  }[];
  return Object.fromEntries(
    data.map((v) => [v.tableName, Math.ceil(v.rowCount)])
  );
}

/**
 * Get column information for a table
 */
async function getTableColumns(tableName: string) {
  const resp = await fetch(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/columns`
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
  stage: DataStage
): Promise<number> {
  const prefix = StorageKeyBuilder.listPrefixForTable(stage, tableName);
  const result = await storage.list({ prefix });

  if (result.keys.length === 0) {
    return 0;
  }

  // Parse page numbers from keys
  const pageNumbers = result.keys
    .map((key) => StorageKeyBuilder.parseKey(key.key))
    .filter((ref) => ref !== null)
    .map((ref) => ref!.page);

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
  const tableCounts = await getTableCounts();
  const totalRows = tableCounts[tableName] || 0;

  console.log(`📋 Total rows in API: ${totalRows.toLocaleString()}`);

  // Determine starting page based on mode
  const lastScrapedPage = await getLastScrapedPage(storage, tableName, stage);

  let startPage: number;
  let singlePageMode = false;

  switch (mode.type) {
    case "auto-resume":
      startPage = lastScrapedPage + 1;
      if (lastScrapedPage > 0) {
        console.log(`✅ Already scraped: ${lastScrapedPage} pages`);
        console.log(`🔄 Auto-resuming from page: ${startPage}`);
      } else {
        console.log(`🚀 Starting fresh from page: ${startPage}`);
      }
      break;

    case "start-from":
      startPage = mode.page;
      console.log(`🚀 Starting from page: ${startPage} (will continue until end)`);
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

  // Calculate total rows already scraped (for progress calculation)
  let totalRowsScraped = 0;

  if (startPage > 1) {
    // Count rows from all previously scraped pages
    for (let page = 1; page < startPage; page++) {
      const pageKey = StorageKeyBuilder.forPage(stage, tableName, page);
      const pageData = await storage.get(pageKey);

      if (pageData) {
        try {
          const pageContent = JSON.parse(pageData) as EduskuntaApiResponse;
          totalRowsScraped += pageContent.rowCount;
        } catch (error) {
          console.warn(`⚠️  Could not read page ${page} for progress calculation`);
        }
      }
    }

    if (totalRowsScraped > 0) {
      const percentComplete = totalRows > 0 ? (totalRowsScraped / totalRows) * 100 : 0;
      console.log(`📊 Already scraped: ${totalRowsScraped.toLocaleString()} rows (${percentComplete.toFixed(1)}%)`);
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
      console.error(`⚠️  Cannot find page ${prevPage}, required to start from page ${startPage}`);
      console.error(`⚠️  Please scrape from page 1 or use auto-resume mode`);
      throw new Error(`Missing page ${prevPage} - cannot determine starting primary key`);
    }

    const prevContent = JSON.parse(prevPageData) as EduskuntaApiResponse;

    if (prevContent.pkLastValue !== null) {
      pkStartValue = prevContent.pkLastValue + 1;
    } else {
      // Fallback: use last row's primary key
      const indexOfPrimaryKey = prevContent.columnNames.indexOf(primaryColumn);
      const lastRow = prevContent.rowData[prevContent.rowData.length - 1];
      if (lastRow && lastRow[indexOfPrimaryKey] !== undefined) {
        pkStartValue = lastRow[indexOfPrimaryKey] + 1;
      } else {
        throw new Error(`Cannot determine primary key from page ${prevPage}`);
      }
    }

    console.log(`📌 Starting from primary key: ${pkStartValue} (from previous page)`);
  }

  const baseUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`
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

    totalRowsScraped += content.rowCount;
    const percentComplete = totalRows > 0 ? (totalRowsScraped / totalRows) * 100 : 0;

    console.log(
      `✅ Saved page ${currentPage} (${content.rowCount} rows) - ${percentComplete.toFixed(1)}% complete`
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
        pkStartValue = lastRow[indexOfPrimaryKey] + 1;
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
  console.log(`📊 Total rows scraped: ${totalRowsScraped.toLocaleString()}`);
}

/**
 * Scrape multiple tables
 */
export async function scrapeTables(
  tableNames: string[],
  options?: Omit<ScrapeOptions, "tableName">
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

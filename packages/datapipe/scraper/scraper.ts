import { scheduler } from "node:timers/promises";
import type { DataStage } from "#storage";
import { getStorage, listAllStorageKeys, StorageKeyBuilder } from "#storage";
import { getRawRowStore } from "#storage/row-store/factory";
import { getExactTableCountByRows } from "#table-counts";

/** Time to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 25;

/** At most make these many requests to avoid infinite call loops. */
const MAX_LOOP_LIMIT = 10_000; // Meaning ~ 1,000,000 rows

/**
 * Tables that continue to use the legacy file-based storage.
 * VaskiData has special parser hooks that depend on file paths.
 */
const LEGACY_FILE_STORAGE_TABLES = new Set(["VaskiData"]);

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
 * Get info about the last scraped page (highest firstPk) for a table.
 * Returns null if no pages exist yet.
 * @deprecated Used only by legacy file-based storage path (VaskiData).
 */
export async function getLastScrapedPageRef(
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
    curr.ref.firstPk > max.ref.firstPk ||
    (curr.ref.firstPk === max.ref.firstPk &&
      curr.ref.lastPk > max.ref.lastPk)
      ? curr
      : max,
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

function parseNonNegativeInteger(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value >= 0) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return null;
}

export function normalizeScrapeMode(mode: unknown): ScrapeMode {
  if (mode && typeof mode === "object") {
    const modeType = (mode as { type?: unknown }).type;

    if (modeType === "auto-resume") {
      return { type: "auto-resume" };
    }

    if (modeType === "start-from-pk") {
      const pkStartValue = parseNonNegativeInteger(
        (mode as { pkStartValue?: unknown }).pkStartValue,
      );
      if (pkStartValue !== null) {
        return { type: "start-from-pk", pkStartValue };
      }
    }

    if (modeType === "patch-from-pk") {
      const pkStartValue = parseNonNegativeInteger(
        (mode as { pkStartValue?: unknown }).pkStartValue,
      );
      if (pkStartValue !== null) {
        return { type: "patch-from-pk", pkStartValue };
      }
    }

    if (modeType === "continue") {
      return { type: "auto-resume" };
    }
  }

  if (mode === "continue" || mode === "auto-resume") {
    return { type: "auto-resume" };
  }

  return { type: "auto-resume" };
}

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
 * Scrape a table from Eduskunta API and save to the row store (DB-backed, upsert semantics).
 * VaskiData is routed to the legacy file-based path instead.
 */
export async function scrapeTable(options: ScrapeOptions): Promise<void> {
  if (LEGACY_FILE_STORAGE_TABLES.has(options.tableName)) {
    return scrapeTableLegacyFileStorage(options);
  }
  return scrapeTableToRowStore(options);
}

/**
 * DB-backed scraper: writes each row individually to raw.db with upsert semantics.
 */
async function scrapeTableToRowStore(options: ScrapeOptions): Promise<void> {
  const { tableName, mode: requestedMode, onProgress } = options;
  const mode = normalizeScrapeMode(requestedMode);

  const rawStore = getRawRowStore();

  console.log(`\n📥 Scraping table: ${tableName}`);
  console.log(`📁 Store: ${rawStore.name}`);

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
      const maxPk = await rawStore.maxPk(tableName);
      if (maxPk !== null) {
        pkStartValue = maxPk + 1;
        totalRowsScraped = await rawStore.count(tableName);
        console.log(
          `✅ Already scraped: ${totalRowsScraped.toLocaleString()} rows`,
        );
        console.log(`🔄 Resuming from PK: ${pkStartValue}`);
        if (totalRowsScraped > 0) {
          const percentComplete =
            totalRows > 0
              ? Math.min((totalRowsScraped / totalRows) * 100, 100)
              : 0;
          console.log(
            `📊 Progress: ${formatPercent(percentComplete)}% complete`,
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

    baseUrl.searchParams.set("pkStartValue", String(pkStartValue));

    console.log(`📡 Fetching batch from PK ${pkStartValue}...`);

    const response = await fetch(baseUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = (await response.json()) as EduskuntaApiResponse;

    if (content.rowCount === 0) {
      console.log("✅ No more data to scrape");
      break;
    }

    const indexOfPrimaryKey = content.columnNames.indexOf(primaryColumn);
    const lastRowPkRaw =
      content.rowData[content.rowData.length - 1][indexOfPrimaryKey];
    const lastPk =
      content.pkLastValue !== null
        ? content.pkLastValue
        : typeof lastRowPkRaw === "string"
          ? parseInt(lastRowPkRaw, 10)
          : (lastRowPkRaw as number);

    // Build rows for upsert
    const batchRows = content.rowData.map((rowData) => {
      const pkRaw = rowData[indexOfPrimaryKey];
      const pk =
        typeof pkRaw === "string" ? parseInt(pkRaw, 10) : (pkRaw as number);
      return { pk, data: JSON.stringify(rowData) };
    });

    await rawStore.upsertBatch(
      tableName,
      primaryColumn,
      content.columnNames,
      batchRows,
    );

    totalRowsScraped += content.rowCount;
    rowsScrapedThisRun += content.rowCount;
    pagesScrapedThisRun++;

    const adjustedTotal = Math.max(totalRows, totalRowsScraped);
    const percentComplete =
      adjustedTotal > 0
        ? Math.min((totalRowsScraped / adjustedTotal) * 100, 100)
        : 0;

    const firstPkRaw = content.rowData[0][indexOfPrimaryKey];
    const firstPk =
      typeof firstPkRaw === "string"
        ? parseInt(firstPkRaw, 10)
        : (firstPkRaw as number);

    console.log(
      `✅ Upserted ${content.rowCount} rows (PK ${firstPk}–${lastPk}) - ${formatPercent(percentComplete)}% complete`,
    );

    if (onProgress) {
      onProgress({
        page: internalPageCounter,
        rowCount: content.rowCount,
        totalRows: totalRowsScraped,
        percentComplete,
      });
    }

    if (patchMode) {
      if (patchFollowUpDone) {
        console.log("✅ Patch complete (patch page + follow-up page scraped)");
        break;
      }
      patchFollowUpDone = true;
    }

    if (!content.hasMore) {
      console.log("✅ Reached end of data");
      break;
    }

    await scheduler.wait(TIME_BETWEEN_QUERIES);

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
  console.log(`📊 Batches scraped in this run: ${pagesScrapedThisRun}`);
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
 * Legacy file-based scraper for tables that require file storage (VaskiData).
 */
async function scrapeTableLegacyFileStorage(
  options: ScrapeOptions,
): Promise<void> {
  const {
    tableName,
    mode: requestedMode,
    stage = "raw",
    onProgress,
  } = options;
  const mode = normalizeScrapeMode(requestedMode);

  const storage = getStorage();

  console.log(`\n📥 Scraping table: ${tableName} (legacy file storage)`);
  console.log(`📁 Storage: ${storage.name}`);
  console.log(`📊 Stage: ${stage}`);

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
        pkStartValue = lastPage.firstPk;
        internalPageCounter = lastPage.pageCount;
        totalRowsScraped = (lastPage.pageCount - 1) * 100;
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

    baseUrl.searchParams.set("pkStartValue", String(pkStartValue));

    console.log(`📡 Fetching batch from PK ${pkStartValue}...`);

    const response = await fetch(baseUrl.toString(), {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const content = (await response.json()) as EduskuntaApiResponse;

    if (content.rowCount === 0) {
      console.log("✅ No more data to scrape");
      break;
    }

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

    totalRowsScraped += content.rowCount;
    rowsScrapedThisRun += content.rowCount;
    pagesScrapedThisRun++;

    const adjustedTotal = Math.max(totalRows, totalRowsScraped);
    const percentComplete =
      adjustedTotal > 0
        ? Math.min((totalRowsScraped / adjustedTotal) * 100, 100)
        : 0;

    console.log(
      `✅ Saved page_${String(firstPk).padStart(12, "0")}+${String(lastPk).padStart(12, "0")} (${content.rowCount} rows) - ${formatPercent(percentComplete)}% complete`,
    );

    if (onProgress) {
      onProgress({
        page: internalPageCounter,
        rowCount: content.rowCount,
        totalRows: totalRowsScraped,
        percentComplete,
      });
    }

    if (patchMode) {
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
        console.log("✅ Patch complete (patch page + follow-up page scraped)");
        break;
      }

      patchFollowUpDone = true;
    }

    if (!content.hasMore) {
      console.log("✅ Reached end of data");
      break;
    }

    await scheduler.wait(TIME_BETWEEN_QUERIES);

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

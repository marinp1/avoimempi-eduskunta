import { scheduler } from "node:timers/promises";
import { getRawRowStore } from "#storage/row-store/factory";
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
 * Scrape modes
 */
export type ScrapeMode =
  | { type: "auto-resume" }
  | { type: "start-from-pk"; pkStartValue: number }
  | { type: "patch-from-pk"; pkStartValue: number }
  | { type: "range"; pkStartValue: number; pkEndValue: number };

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

    if (modeType === "range") {
      const pkStartValue = parseNonNegativeInteger(
        (mode as { pkStartValue?: unknown }).pkStartValue,
      );
      const pkEndValue = parseNonNegativeInteger(
        (mode as { pkEndValue?: unknown }).pkEndValue,
      );
      if (
        pkStartValue !== null &&
        pkEndValue !== null &&
        pkEndValue >= pkStartValue
      ) {
        return { type: "range", pkStartValue, pkEndValue };
      }
    }

    if (modeType === "single-pk") {
      const pkValue = parseNonNegativeInteger(
        (mode as { pkValue?: unknown }).pkValue,
      );
      if (pkValue !== null) {
        return { type: "range", pkStartValue: pkValue, pkEndValue: pkValue };
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
  onProgress?: (progress: {
    page: number;
    rowCount: number;
    totalRows: number;
    percentComplete: number;
  }) => void;
}

/**
 * Scrape a table from Eduskunta API and save to the row store (DB-backed, upsert semantics).
 */
export async function scrapeTable(options: ScrapeOptions): Promise<void> {
  const { tableName, mode: requestedMode, onProgress } = options;
  const mode = normalizeScrapeMode(requestedMode);

  const rawStore = getRawRowStore();

  console.log(`\n📥 Scraping table: ${tableName}`);
  console.log(`📁 Store: ${rawStore.name}`);

  const { primaryColumn } = await getTableColumns(tableName);
  const totalRows = await getExactTableCountByRows(tableName);

  console.log(`📋 Total rows in API: ${totalRows.toLocaleString()}`);

  let pkStartValue: number;
  let rangeStartValue: number | null = null;
  let pkEndValue: number | null = null;
  let patchMode = false;
  let patchFollowUpDone = false;
  let internalPageCounter = 1;
  let totalRowsScraped = await rawStore.count(tableName);

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

    case "range":
      pkStartValue = mode.pkStartValue;
      rangeStartValue = mode.pkStartValue;
      pkEndValue = mode.pkEndValue;
      console.log(
        `🎯 Range mode: scraping PK ${pkStartValue}..${pkEndValue} (inclusive)`,
      );
      break;
  }

  console.log();

  const baseUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`,
  );
  baseUrl.searchParams.set("pkName", primaryColumn);

  let loopCount = 0;
  let rowsScrapedThisRun = 0;
  let pagesScrapedThisRun = 0;

  do {
    if (loopCount >= MAX_LOOP_LIMIT) {
      console.error("⚠️  Reached maximum loop limit!");
      throw new Error("Sanity check error: MAX_LOOP_LIMIT reached");
    }

    const perPage =
      pkEndValue === null
        ? 100
        : Math.max(1, Math.min(100, pkEndValue - pkStartValue + 1));
    baseUrl.searchParams.set("perPage", String(perPage));
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
      totalRowsScraped = await rawStore.count(tableName);
      console.log("✅ No more data to scrape");
      break;
    }

    const indexOfPrimaryKey = content.columnNames.indexOf(primaryColumn);
    const firstRowPkRaw = content.rowData[0][indexOfPrimaryKey];
    const firstPk =
      typeof firstRowPkRaw === "string"
        ? parseInt(firstRowPkRaw, 10)
        : (firstRowPkRaw as number);
    const lastRowPkRaw =
      content.rowData[content.rowData.length - 1][indexOfPrimaryKey];
    const lastPk =
      content.pkLastValue !== null
        ? content.pkLastValue
        : typeof lastRowPkRaw === "string"
          ? parseInt(lastRowPkRaw, 10)
          : (lastRowPkRaw as number);

    // Build rows for upsert (respect optional PK range end bound)
    const batchRows = content.rowData.flatMap((rowData) => {
      const pkRaw = rowData[indexOfPrimaryKey];
      const pk =
        typeof pkRaw === "string" ? parseInt(pkRaw, 10) : (pkRaw as number);
      if (pkEndValue !== null && pk > pkEndValue) {
        return [];
      }
      return [{ pk, data: JSON.stringify(rowData) }];
    });

    if (batchRows.length > 0) {
      await rawStore.upsertBatch(
        tableName,
        primaryColumn,
        content.columnNames,
        batchRows,
      );
      rowsScrapedThisRun += batchRows.length;
    }

    totalRowsScraped = await rawStore.count(tableName);
    pagesScrapedThisRun++;

    const percentComplete =
      pkEndValue !== null && rangeStartValue !== null
        ? (() => {
            const rangeTotal = pkEndValue - rangeStartValue + 1;
            const coveredEnd = Math.min(lastPk, pkEndValue);
            const covered =
              coveredEnd >= rangeStartValue
                ? coveredEnd - rangeStartValue + 1
                : 0;
            return Math.min((covered / rangeTotal) * 100, 100);
          })()
        : (() => {
            const adjustedTotal = Math.max(totalRows, totalRowsScraped);
            return adjustedTotal > 0
              ? Math.min((totalRowsScraped / adjustedTotal) * 100, 100)
              : 0;
          })();

    console.log(
      `✅ Upserted ${batchRows.length} rows (PK ${firstPk}–${lastPk}) - ${formatPercent(percentComplete)}% complete`,
    );

    if (onProgress) {
      onProgress({
        page: internalPageCounter,
        rowCount: batchRows.length,
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

    if (pkEndValue !== null) {
      if (firstPk > pkEndValue) {
        console.log(
          `✅ Range complete (no rows at or below PK ${pkEndValue} in this batch)`,
        );
        break;
      }

      if (lastPk >= pkEndValue) {
        console.log(`✅ Range complete at PK ${pkEndValue}`);
        break;
      }
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

  const shouldWarnOnCountDrift =
    mode.type === "auto-resume" ||
    (mode.type === "start-from-pk" && mode.pkStartValue === 0);
  if (shouldWarnOnCountDrift && totalRows > 0 && totalRowsScraped !== totalRows) {
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

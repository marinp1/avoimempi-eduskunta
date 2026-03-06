import { scheduler } from "node:timers/promises";
import type { TableName } from "#constants";
import { getRawRowStore } from "#storage/row-store/factory";
import {
  getExactTableCountByRows,
  readPersistedTableCount,
} from "#table-counts";

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
  /**
   * Stop after this many API pages and signal the caller to re-enqueue the
   * remainder. Useful for cloud functions with a hard execution time limit.
   * Unlimited by default.
   */
  maxPagesPerInvocation?: number;
  /**
   * When true, read the persisted API row count (saved by fetch-counts-cli)
   * and skip scraping if the local store already has at least that many rows.
   * No-op when no persisted count is found.
   */
  skipIfUnchanged?: boolean;
  onProgress?: (progress: {
    page: number;
    rowCount: number;
    totalRows: number;
    percentComplete: number;
  }) => void;
}

/**
 * Result returned by scrapeTable().
 */
export interface ScrapeResult {
  rowsScraped: number;
  pagesScraped: number;
  totalRowsStored: number;
  /** First PK actually written to the store in this run. Null if nothing was written. */
  pkStartValue: number | null;
  /** Last PK actually written to the store in this run. Null if nothing was written. */
  pkEndValue: number | null;
  /**
   * True when maxPagesPerInvocation was reached before the pass completed.
   * The caller should re-enqueue a continuation task starting from continuationPk.
   */
  truncated: boolean;
  /** Next PK to start from in the continuation task. Only set when truncated=true. */
  continuationPk: number | null;
}

/**
 * Scrape a table from Eduskunta API and save to the row store (DB-backed, upsert semantics).
 */
export async function scrapeTable(
  options: ScrapeOptions,
): Promise<ScrapeResult> {
  const { tableName, mode: requestedMode, onProgress } = options;
  const mode = normalizeScrapeMode(requestedMode);

  const rawStore = getRawRowStore();

  console.log(`\n📥 Scraping table: ${tableName}`);
  console.log(`📁 Store: ${rawStore.name}`);

  // Resolve total API row count: prefer the persisted count to avoid a live
  // network request; fall back to a live fetch when no persisted count exists.
  const cachedCount = await readPersistedTableCount(tableName as TableName);

  // Fetch column info early — needed both for the skip-check peek and for scraping.
  const { primaryColumn } = await getTableColumns(tableName);

  // Skip scraping if local data is already up-to-date according to the saved count.
  // The count alone is not reliable: the API may have deleted rows (lowering the
  // count) while simultaneously adding new rows with higher PKs. When counts
  // suggest nothing changed, do a lightweight peek just beyond our local max PK
  // to confirm there are no new rows before skipping.
  if (options.skipIfUnchanged && cachedCount !== null) {
    const localCount = await rawStore.count(tableName);
    if (localCount >= cachedCount) {
      const localMaxPk = await rawStore.maxPk(tableName);
      let hasNewRowsBeyondLocalMax = false;

      if (localMaxPk !== null) {
        const peekUrl = new URL(
          `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`,
        );
        peekUrl.searchParams.set("pkName", primaryColumn);
        peekUrl.searchParams.set("perPage", "1");
        peekUrl.searchParams.set("pkStartValue", String(localMaxPk + 1));

        const peekResp = await fetch(peekUrl.toString());
        if (peekResp.ok) {
          const peekData = (await peekResp.json()) as EduskuntaApiResponse;
          hasNewRowsBeyondLocalMax = peekData.rowCount > 0;
        }
      }

      if (!hasNewRowsBeyondLocalMax) {
        console.log(
          `⏭️  Skipping ${tableName}: API has ${cachedCount.toLocaleString()} rows, stored ${localCount.toLocaleString()} rows, no new rows beyond local max PK`,
        );
        return {
          rowsScraped: 0,
          pagesScraped: 0,
          totalRowsStored: localCount,
          pkStartValue: null,
          pkEndValue: null,
          truncated: false,
          continuationPk: null,
        };
      }

      console.log(
        `🔄 ${tableName}: API count=${cachedCount.toLocaleString()}, local=${localCount.toLocaleString()}, but new rows found beyond PK ${localMaxPk} — scraping...`,
      );
    }
  }

  const totalRows =
    cachedCount !== null
      ? cachedCount
      : await getExactTableCountByRows(tableName);

  console.log(`📋 Total rows in API: ${totalRows.toLocaleString()}`);

  let totalRowsScraped = await rawStore.count(tableName);
  let rowsScrapedThisRun = 0;
  let pagesScrapedThisRun = 0;
  let progressPageCounter = 1;

  const formatPercent = (value: number): string => {
    if (value >= 100) return "100.0";
    return Math.min(value, 99.9).toFixed(1);
  };

  type ScrapePassOptions = {
    pkStartValue: number;
    pkEndValue: number | null;
    rangeStartValue: number | null;
    patchMode: boolean;
    emitProgress: boolean;
  };

  type ScrapePassResult = {
    rowsWritten: number;
    pagesScraped: number;
    totalRowsStored: number;
    firstPkWritten: number | null;
    lastPkWritten: number | null;
    truncated: boolean;
    continuationPk: number | null;
  };

  const maxPages = options.maxPagesPerInvocation;

  const runScrapePass = async (
    passOptions: ScrapePassOptions,
  ): Promise<ScrapePassResult> => {
    const { pkEndValue, rangeStartValue, patchMode, emitProgress } =
      passOptions;
    let pkStartValue = passOptions.pkStartValue;
    let patchFollowUpDone = false;
    let loopCount = 0;
    let rowsWritten = 0;
    let pagesScraped = 0;
    let firstPkWritten: number | null = null;
    let lastPkWritten: number | null = null;

    const baseUrl = new URL(
      `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch`,
    );
    baseUrl.searchParams.set("pkName", primaryColumn);

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
        if (firstPkWritten === null) firstPkWritten = batchRows[0].pk;
        lastPkWritten = batchRows[batchRows.length - 1].pk;
        await rawStore.upsertBatch(
          tableName,
          primaryColumn,
          content.columnNames,
          batchRows,
        );
        rowsWritten += batchRows.length;
      }

      totalRowsScraped = await rawStore.count(tableName);
      pagesScraped++;

      // Page cap: stop and signal continuation if there is more data to fetch.
      if (
        maxPages !== undefined &&
        pagesScraped >= maxPages &&
        content.hasMore
      ) {
        let continuationPk: number | null = null;
        if (content.pkLastValue !== null) {
          continuationPk = content.pkLastValue + 1;
        } else {
          const lastRow = content.rowData[content.rowData.length - 1];
          if (lastRow?.[indexOfPrimaryKey] !== undefined) {
            const v = lastRow[indexOfPrimaryKey];
            continuationPk = (typeof v === "string" ? parseInt(v, 10) : v) + 1;
          }
        }
        if (continuationPk !== null) {
          console.log(
            `⏱️  Page cap reached (${pagesScraped}/${maxPages}), continuation from PK ${continuationPk}`,
          );
          return {
            rowsWritten,
            pagesScraped,
            totalRowsStored: totalRowsScraped,
            firstPkWritten,
            lastPkWritten,
            truncated: true,
            continuationPk,
          };
        }
      }

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

      if (emitProgress && onProgress) {
        onProgress({
          page: progressPageCounter,
          rowCount: batchRows.length,
          totalRows: totalRowsScraped,
          percentComplete,
        });
      }
      progressPageCounter++;

      if (patchMode) {
        if (patchFollowUpDone) {
          console.log(
            "✅ Patch complete (patch page + follow-up page scraped)",
          );
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

      loopCount++;
    } while (true);

    return {
      rowsWritten,
      pagesScraped,
      totalRowsStored: totalRowsScraped,
      firstPkWritten,
      lastPkWritten,
      truncated: false,
      continuationPk: null,
    };
  };

  const collectInternalMissingRanges = async (): Promise<
    Array<{ start: number; end: number; count: number }>
  > => {
    const ranges: Array<{ start: number; end: number; count: number }> = [];
    let previousPk: number | null = null;

    for await (const row of rawStore.list(tableName)) {
      if (previousPk !== null && row.pk - previousPk > 1) {
        const start = previousPk + 1;
        const end = row.pk - 1;
        ranges.push({
          start,
          end,
          count: end - start + 1,
        });
      }
      previousPk = row.pk;
    }

    return ranges;
  };

  let initialPassStartPk: number;
  let initialPassRangeStart: number | null = null;
  let initialPassEndPk: number | null = null;
  let initialPassPatchMode = false;

  switch (mode.type) {
    case "auto-resume": {
      const maxPk = await rawStore.maxPk(tableName);
      if (maxPk !== null) {
        initialPassStartPk = maxPk + 1;
        totalRowsScraped = await rawStore.count(tableName);
        console.log(
          `✅ Already scraped: ${totalRowsScraped.toLocaleString()} rows`,
        );
        console.log(`🔄 Resuming from PK: ${initialPassStartPk}`);
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
        initialPassStartPk = 0;
        console.log(`🚀 Starting fresh`);
      }
      break;
    }

    case "start-from-pk":
      initialPassStartPk = mode.pkStartValue;
      console.log(
        `🚀 Starting from PK: ${initialPassStartPk} (will continue until end)`,
      );
      break;

    case "patch-from-pk":
      initialPassStartPk = mode.pkStartValue;
      initialPassPatchMode = true;
      console.log(
        `🩹 Patch mode from PK: ${initialPassStartPk} (scrapes patch page + 1 follow-up page)`,
      );
      break;

    case "range":
      initialPassStartPk = mode.pkStartValue;
      initialPassRangeStart = mode.pkStartValue;
      initialPassEndPk = mode.pkEndValue;
      console.log(
        `🎯 Range mode: scraping PK ${initialPassStartPk}..${initialPassEndPk} (inclusive)`,
      );
      break;
  }

  console.log();

  const firstPassResult = await runScrapePass({
    pkStartValue: initialPassStartPk,
    pkEndValue: initialPassEndPk,
    rangeStartValue: initialPassRangeStart,
    patchMode: initialPassPatchMode,
    emitProgress: true,
  });
  rowsScrapedThisRun += firstPassResult.rowsWritten;
  pagesScrapedThisRun += firstPassResult.pagesScraped;
  totalRowsScraped = firstPassResult.totalRowsStored;

  let aggregatedFirstPk = firstPassResult.firstPkWritten;
  let aggregatedLastPk = firstPassResult.lastPkWritten;

  // If the page cap was hit, skip gap repair — the forward pass isn't done yet.
  // The handler will re-enqueue a continuation task.
  if (firstPassResult.truncated) {
    return {
      rowsScraped: rowsScrapedThisRun,
      pagesScraped: pagesScrapedThisRun,
      totalRowsStored: totalRowsScraped,
      pkStartValue: aggregatedFirstPk,
      pkEndValue: aggregatedLastPk,
      truncated: true,
      continuationPk: firstPassResult.continuationPk,
    };
  }

  const shouldAutoRepairGaps =
    mode.type === "auto-resume" ||
    (mode.type === "start-from-pk" && mode.pkStartValue === 0);
  if (shouldAutoRepairGaps && totalRows > totalRowsScraped) {
    const missingRanges = await collectInternalMissingRanges();

    if (missingRanges.length > 0) {
      const gapIdCount = missingRanges.reduce(
        (sum, item) => sum + item.count,
        0,
      );
      console.log(
        `\n🩹 Auto-repair: found ${missingRanges.length.toLocaleString()} internal gaps (${gapIdCount.toLocaleString()} PKs), attempting range repairs...`,
      );

      for (const range of missingRanges) {
        if (totalRowsScraped >= totalRows) {
          break;
        }

        console.log(
          `🩹 Repairing gap PK ${range.start}..${range.end} (${range.count.toLocaleString()} IDs)`,
        );
        const gapRepairResult = await runScrapePass({
          pkStartValue: range.start,
          pkEndValue: range.end,
          rangeStartValue: range.start,
          patchMode: false,
          emitProgress: false,
        });
        rowsScrapedThisRun += gapRepairResult.rowsWritten;
        pagesScrapedThisRun += gapRepairResult.pagesScraped;
        totalRowsScraped = gapRepairResult.totalRowsStored;

        if (gapRepairResult.firstPkWritten !== null) {
          if (
            aggregatedFirstPk === null ||
            gapRepairResult.firstPkWritten < aggregatedFirstPk
          ) {
            aggregatedFirstPk = gapRepairResult.firstPkWritten;
          }
        }
        if (gapRepairResult.lastPkWritten !== null) {
          if (
            aggregatedLastPk === null ||
            gapRepairResult.lastPkWritten > aggregatedLastPk
          ) {
            aggregatedLastPk = gapRepairResult.lastPkWritten;
          }
        }
      }
    }
  }

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
  if (
    shouldWarnOnCountDrift &&
    totalRows > 0 &&
    totalRowsScraped !== totalRows
  ) {
    const diff = totalRows - totalRowsScraped;
    const relation = diff > 0 ? "less" : "more";
    console.warn(
      `⚠️  Stored rows (${totalRowsScraped.toLocaleString()}) differ from API counts (${totalRows.toLocaleString()}) by ${Math.abs(diff).toLocaleString()} (${relation} than API count).`,
    );
  }

  return {
    rowsScraped: rowsScrapedThisRun,
    pagesScraped: pagesScrapedThisRun,
    totalRowsStored: totalRowsScraped,
    pkStartValue: aggregatedFirstPk,
    pkEndValue: aggregatedLastPk,
    truncated: false,
    continuationPk: null,
  };
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

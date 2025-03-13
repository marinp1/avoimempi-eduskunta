import { scheduler } from "node:timers/promises";
import sqlite from "bun:sqlite";
import path from "path";
import fs from "fs";
import { TableNames } from "../../shared/constants/TableNames";

/** To to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 10;

/** At most make these many requests to avoid infinite call loops. */
let MAX_LOOP_LIMIT = 2000;

// EXAMPLE FOR FETCHING SINGLE ENTRY BY ID
// https://avoindata.eduskunta.fi/api/v1/tables/MemberOfParliament/batch?pkName=personId&pkStartValue=102&perPage=1

/**
 * Fetches data from eduskunta API endpoint and saves each response to disk
 * for futher processing.
 * @param tableName Table to fetch information from.
 */
const scrape = async <T extends Modules.Common.TableName>(
  tableName: T,
  _startFromPage?: number
) => {
  let db = sqlite.open(
    path.resolve(import.meta.dirname, "data", `${tableName}.db`),
    { create: true, readwrite: true }
  );

  db.exec(
    `CREATE TABLE IF NOT EXISTS ${tableName} (page INTEGER PRIMARY KEY, perPage INTEGER, hasMore BOOLEAN, tableName TEXT, columnNames TEXT, rowData TEXT, columnCount INTEGER, rowCount INTEGER, pkName TEXT, pkStartValue TEXT, pkLastValue TEXT)`
  );

  const startPage = (() => {
    if (_startFromPage !== undefined) return _startFromPage;
    const stmt = db.prepare<{ page: number }, []>(
      `SELECT page FROM ${tableName} ORDER BY page DESC LIMIT 1`
    );
    const result = stmt.get()?.page ?? 0;
    stmt.finalize();
    return Math.max(0, result - 1);
  })();

  let page = startPage;
  /** Content of the API call. */
  let content: Modules.Scraper.ApiResponse;
  const ApiUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/rows?page=${page}&perPage=100`
  );

  do {
    // Adjust ?page query parameter before each call
    ApiUrl.searchParams.set("page", String(page));
    console.log("Fetching", ApiUrl.toString());
    const response = await fetch(ApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    content = (await response.json()) as Modules.Scraper.ApiResponse;
    const KEYS = Object.keys(content)
      .map((key) => `"${key}"`)
      .join(", ");
    const VALUES = Object.values(content)
      .map((value) => `'${JSON.stringify(value)}'`)
      .join(", ");
    db.exec(`REPLACE INTO ${tableName} (${KEYS}) VALUES (${VALUES})`);
    // Wait before next call
    await scheduler.wait(TIME_BETWEEN_QUERIES);
    // Increment page index
    page++;
  } while (content.hasMore && MAX_LOOP_LIMIT-- > 0);

  // If the scraping has been stopped due to limit reached, throw an error.
  if (MAX_LOOP_LIMIT <= 0) {
    throw new Error("Sanity check error");
  }

  db.close();
};

const [, , tableToUse, startFromPage] = process.argv;

if (!TableNames.includes(tableToUse as any)) {
  console.warn("Table name should be one of", TableNames);
  throw new Error("Invalid table name!");
}

const pageToUse = (() => {
  const n = +startFromPage;
  if (Number.isNaN(n) || !Number.isInteger(n) || n < 0) return undefined;
  return n;
})();

await scrape(tableToUse as Modules.Common.TableName, pageToUse);

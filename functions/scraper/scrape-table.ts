import { scheduler } from "node:timers/promises";
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
  startFromPage?: number
) => {
  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder);

  if (startFromPage === undefined) {
    if (!fs.existsSync(path.resolve(distFolder, "meta.json"))) {
      startFromPage = 0;
    } else {
      const { lastFetchedPage } = JSON.parse(
        fs.readFileSync(path.resolve(distFolder, "meta.json"), {
          encoding: "utf-8",
        })
      );
      if (typeof lastFetchedPage !== "number") {
        throw new Error("Failed to read lastFetchedPage from meta.json");
      }
      startFromPage = Math.max(0, lastFetchedPage);
    }
  }

  /**
   * Function to write special meta.json
   * to disk that contains information about latest fetch.
   */
  const writeMeta = (params: {
    lastFetchedPage: number;
    lastFetchTs: number;
    pkStartValue: unknown;
    pkEndValue: unknown;
  }) => {
    fs.writeFileSync(
      path.resolve(distFolder, "meta.json"),
      JSON.stringify(params, null, 2)
    );
  };

  let page = startFromPage;
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
    // Write content to file
    fs.writeFileSync(
      path.resolve(distFolder, `page-${String(page).padStart(5, "0")}.json`),
      JSON.stringify(content, null, 2)
    );
    // Write meta file to disk
    const primaryKeyDataIndex = content.columnNames?.indexOf(content["pkName"]);
    writeMeta({
      lastFetchedPage: page,
      lastFetchTs: Date.now(),
      pkStartValue: content.rowData[0]?.[primaryKeyDataIndex],
      pkEndValue:
        content.rowData[content.rowData.length - 1]?.[primaryKeyDataIndex],
    });
    // Wait before next call
    await scheduler.wait(TIME_BETWEEN_QUERIES);
    // Increment page index
    page++;
  } while (content.hasMore && MAX_LOOP_LIMIT-- > 0);

  // If the scraping has been stopped due to limit reached, throw an error.
  if (MAX_LOOP_LIMIT <= 0) {
    throw new Error("Sanity check error");
  }
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

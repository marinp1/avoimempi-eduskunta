import { scheduler } from "node:timers/promises";
import path from "path";
import fs from "fs";
import { TableNames } from "#constants/TableNames.mts";
import { ApiResponse, TableName } from "#types/index.mts";

/** To to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 50;

/** At most make these many requests to avoid infinite call loops. */
let MAX_LOOP_LIMIT = 2000;

/**
 * Fetches data from eduskunta API endpoint and saves each response to disk
 * for futher processing.
 * @param tableName Table to fetch information from.
 */
const scrape = async <T extends TableName>(tableName: T) => {
  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder);

  /**
   * Function to write special meta.json
   * to disk that contains information about latest fetch.
   */
  const writeMeta = (params: {
    lastFetchTs: number;
    pkStartValue: unknown;
    pkEndValue: unknown;
  }) => {
    fs.writeFileSync(
      path.resolve(distFolder, "meta.json"),
      JSON.stringify(params, null, 2)
    );
  };

  /**
   * Page number to start lookup from.
   * FIXME: Always `0` at the moment, this should be last
   * page fetched instead.
   */
  let page = 0;
  /** Content of the API call. */
  let content: ApiResponse;
  const ApiUrl = new URL(`z${tableName}/rows?page=${page}&perPage=100`);

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
    content = (await response.json()) as ApiResponse;
    // Write content to file
    fs.writeFileSync(
      path.resolve(distFolder, `page-${String(page).padStart(5, "0")}.json`),
      JSON.stringify(content, null, 2)
    );
    // Write meta file to disk
    const primaryKeyDataIndex = content.columnNames?.indexOf(content["pkName"]);
    writeMeta({
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

const [, , tableToUse] = process.argv;

if (!TableNames.includes(tableToUse as any)) {
  console.warn("Table name should be one of", TableNames);
  throw new Error("Invalid table name!");
}

await scrape(tableToUse as TableName);

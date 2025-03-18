import { scheduler } from "node:timers/promises";
import sqlite from "bun:sqlite";
import { TableNames } from "../../shared/constants";
import { getRawDatabasePath } from "#database";

/** To to wait (in ms) between API calls. */
const TIME_BETWEEN_QUERIES = 10;

/** At most make these many requests to avoid infinite call loops. */
let MAX_LOOP_LIMIT = 10_000; // Meaning ~ 1 000 000 rows

// EXAMPLE FOR FETCHING SINGLE ENTRY BY ID
// https://avoindata.eduskunta.fi/api/v1/tables/MemberOfParliament/batch?pkName=personId&pkStartValue=102&perPage=1

const rowCounts = await (async () => {
  const resp = await fetch(
    "https://avoindata.eduskunta.fi/api/v1/tables/counts"
  );
  const data = (await resp.json()) as {
    tableName: Modules.Common.TableName;
    rowCount: number;
  }[];
  return Object.fromEntries(
    data.map((v) => [v.tableName, Math.ceil(v.rowCount)])
  ) as Record<Modules.Common.TableName, number>;
})();

const getColumnsForTable = async (tableName: Modules.Common.TableName) => {
  const resp = await fetch(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/columns`
  );
  const { pkName, columnNames } =
    (await resp.json()) as Modules.Scraper.ApiResponse;
  return {
    primaryColumn: pkName,
    otherColumns: columnNames.filter((v) => v !== pkName),
  };
};

const openDatabase = async <T extends Modules.Common.TableName>(
  tableName: T
) => {
  const db = sqlite.open(getRawDatabasePath(), {
    create: true,
    readwrite: true,
  });
  db.exec("PRAGMA journal_mode = WAL;");
  const { primaryColumn, otherColumns } = await getColumnsForTable(tableName);
  const KEYS = [
    `"${primaryColumn}" INTERGER PRIMARY KEY`,
    ...otherColumns.map((key) => `"${key}" TEXT`),
  ].join(", ");
  const QUERY = `CREATE TABLE IF NOT EXISTS ${tableName} (${KEYS})`;
  db.exec(QUERY);
  const { rowCount } = db
    .prepare<{ rowCount: number }, []>(
      `SELECT COUNT(${primaryColumn}) as rowCount FROM ${tableName}`
    )
    .get()!;
  return { db, primaryColumn, totalFetched: rowCount };
};
/**
 * Fetches data from eduskunta API endpoint and saves each response to disk
 * for futher processing.
 * @param tableName Table to fetch information from.
 */
const scrape = async <T extends Modules.Common.TableName>(
  tableName: T,
  _startFromPage?: number
) => {
  const { db, primaryColumn, totalFetched } = await openDatabase(tableName);

  const startPrimaryKey = (() => {
    if (_startFromPage !== undefined) return _startFromPage;
    const stmt = db.prepare<{ [x: string]: number }, []>(
      `SELECT ${primaryColumn} FROM ${tableName} ORDER BY ${primaryColumn} DESC LIMIT 1`
    );
    const result = stmt.get()?.[primaryColumn] ?? 0;
    stmt.finalize();
    return Math.max(0, result - 1);
  })();

  let pkStartValue = startPrimaryKey;
  /** Content of the API call. */
  let content: Modules.Scraper.ApiResponse;

  const ApiUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/batch?pkName=${primaryColumn}&pkStartValue=${pkStartValue}&perPage=100`
  );

  console.warn("Total number of rows according to API:", rowCounts[tableName]);
  console.warn(
    "At the moment fetched rows:",
    totalFetched,
    `(${((totalFetched / rowCounts[tableName]) * 100).toFixed(
      2
    )}% fetched so far)`
  );
  console.warn("Starting from", pkStartValue, "in table", tableName);

  do {
    // Adjust ?page query parameter before each call
    ApiUrl.searchParams.set("pkStartValue", String(pkStartValue));
    console.log("Fetching", ApiUrl.toString());
    const response = await fetch(ApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    content = (await response.json()) as Modules.Scraper.ApiResponse;
    if (content.rowCount > 0) {
      const KEYS = content.columnNames.map((key) => `"${key}"`).join(", ");
      await Promise.all(
        content.rowData.map(async (row) => {
          const VALUES = row
            .map((value) => `'${String(value ?? "").replaceAll("'", "''")}'`)
            .join(", ");
          db.exec(`REPLACE INTO ${tableName} (${KEYS}) VALUES (${VALUES})`);
        })
      );
    } else {
      console.log("No content to save");
      break;
    }
    // Wait before next call
    await scheduler.wait(TIME_BETWEEN_QUERIES);
    // Increment page index
    const indexOfPrimaryKey = content.columnNames.indexOf(primaryColumn);
    const lastFetchedKey =
      content.pkLastValue ??
      content.rowData[content.rowData.length - 1]?.[indexOfPrimaryKey] ??
      null;
    if (lastFetchedKey === null) {
      throw new Error("Could not find last fetched key");
    }
    pkStartValue = lastFetchedKey + 1;
  } while (content.hasMore && MAX_LOOP_LIMIT-- > 0);

  // If the scraping has been stopped due to limit reached, throw an error.
  if (MAX_LOOP_LIMIT <= 0) {
    throw new Error("Sanity check error");
  }

  db.close();
};

const [, , tableToUse, startFromPage] = process.argv;

if (tableToUse === "all-tables") {
  for (const tableName of TableNames) {
    if (tableName === "SaliDBAanestysAsiakirja") continue;
    if (tableName === "SaliDBAanestysJakauma") continue;
    await scrape(tableName);
  }
} else {
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
}

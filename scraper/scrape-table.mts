import { scheduler } from "node:timers/promises";
import path from "path";
import fs from "fs";
import { TableNames } from "#constants/TableNames.mts";
import { ApiResponse, TableName } from "#types/index.mts";

const TIME_BETWEEN_QUERIES = 50;

let MAX_LOOP_LIMIT = 2000;

const scrape = async <T extends TableName>(tableName: T) => {
  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder);

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

  const ApiUrl = new URL(
    `https://avoindata.eduskunta.fi/api/v1/tables/${tableName}/rows?page=0&perPage=100`
  );
  let content: ApiResponse;
  let page = 0;
  do {
    ApiUrl.searchParams.set("page", String(page));
    console.log("Fetching", ApiUrl.toString());
    const response = await fetch(ApiUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    content = (await response.json()) as ApiResponse;
    fs.writeFileSync(
      path.resolve(distFolder, `page-${String(page).padStart(5, "0")}.json`),
      JSON.stringify(content, null, 2)
    );
    const primaryKeyDataIndex = content.columnNames?.indexOf(content["pkName"]);
    writeMeta({
      lastFetchTs: Date.now(),
      pkStartValue: content.rowData[0]?.[primaryKeyDataIndex],
      pkEndValue:
        content.rowData[content.rowData.length - 1]?.[primaryKeyDataIndex],
    });
    await scheduler.wait(TIME_BETWEEN_QUERIES);
    page++;
  } while (content.hasMore && MAX_LOOP_LIMIT-- > 0);
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

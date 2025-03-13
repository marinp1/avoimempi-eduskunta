import path from "path";
import fs from "fs";
import sqlite from "bun:sqlite";
import { TableNames, PrimaryKeys } from "../../shared/constants/TableNames";
import type { RawDataModel } from "./types";

/**
 * Default parser to use if no specific handler is found.
 * @param data API response to parse.
 */
const defaultParser = async (
  row: Record<string, any>,
  primaryKey: string
): Promise<[primaryKey: string, data: Partial<Record<string, any>>]> => {
  return [`${row[primaryKey]}`, row];
};

const getParser = async <T extends Modules.Common.TableName>(tableName: T) => {
  try {
    return (await import("./fn/MemberOfParliament")).default;
  } catch (e) {
    console.warn(`No parser found for ${tableName}, using default parser`);
    return defaultParser;
  }
};

const parse = async <T extends Modules.Common.TableName>(tableName: T) => {
  console.time(`Parse ${tableName}`);

  const db = sqlite.open(
    path.join(import.meta.dirname, "../scraper/data", "eduskunta-raw-data.db"),
    {
      create: false,
      readonly: true,
    }
  );

  const parseData = await getParser<T>(tableName);

  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (fs.existsSync(distFolder))
    fs.rmSync(distFolder, { force: true, recursive: true });
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder, { recursive: true });

  let rowsParsed = 0;
  console.log("Parsing table", tableName);
  const query = db.prepare<RawDataModel<T>, []>(`SELECT * FROM ${tableName}`);

  for (const row of query.iterate()) {
    const [fileKey, fileContents] = await parseData(
      row as any,
      PrimaryKeys[tableName] as any
    );
    fs.writeFileSync(
      path.join(distFolder, fileKey + ".json"),
      JSON.stringify(fileContents, null, 2),
      { encoding: "utf8" }
    );
    rowsParsed++;
    if (rowsParsed % 100 === 0) {
      console.log(`Parsed ${rowsParsed} rows`);
    }
  }

  console.log(
    "[DONE]",
    "Parsing done, detected in total",
    rowsParsed,
    "entries"
  );

  console.timeEnd(`Parse ${tableName}`);
};

const [, , tableToUse] = process.argv;

if (!TableNames.includes(tableToUse as any)) {
  console.warn("Table name should be one of", TableNames);
  throw new Error("Invalid table name!");
}

await parse(tableToUse as Modules.Common.TableName);

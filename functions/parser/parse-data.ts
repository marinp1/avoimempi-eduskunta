import path from "path";
import fs from "fs";
import sqlite from "bun:sqlite";
import { TableNames, PrimaryKeys } from "../../shared/constants";
import { getParsedDatabasePath, getRawDatabasePath } from "#database";

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

const getParser = async <T extends Modules.Common.TableName>(
  tableName: T
): Promise<typeof defaultParser> => {
  try {
    return (await import(`./fn/${tableName}`)).default;
  } catch (e) {
    console.warn(`No parser found for ${tableName}, using default parser`);
    return defaultParser;
  }
};

const parse = async <T extends Modules.Common.TableName>(tableName: T) => {
  console.time(`Parse ${tableName}`);

  const sourceDb = sqlite.open(getRawDatabasePath(), {
    create: false,
    readonly: true,
  });

  const targetDatabase = sqlite.open(getParsedDatabasePath(), {
    create: true,
    readwrite: true,
  });

  sourceDb.exec("PRAGMA journal_mode = WAL;");
  targetDatabase.exec("PRAGMA journal_mode = WAL;");

  {
    const { sql } = sourceDb
      .query<{ sql: string }, { $tableName: string }>(
        `SELECT sql FROM sqlite_master WHERE type='table' AND name = $tableName`
      )
      .get({ $tableName: tableName })!;
    if (!sql.startsWith("CREATE TABLE "))
      throw new Error("Invalid table schema");
    const modifiedQuery = sql.replace(
      "CREATE TABLE",
      "CREATE TABLE IF NOT EXISTS"
    );
    targetDatabase.exec(modifiedQuery);
  }

  const parseData = await getParser<T>(tableName);

  const distFolder = path.resolve(import.meta.dirname, "data", tableName);
  if (fs.existsSync(distFolder))
    fs.rmSync(distFolder, { force: true, recursive: true });
  if (!fs.existsSync(distFolder)) fs.mkdirSync(distFolder, { recursive: true });

  let rowsParsed = 0;
  console.log("Parsing table", tableName);
  const query = sourceDb.prepare<RawDataModel<T>, []>(
    `SELECT * FROM ${tableName}`
  );

  const mapValue = (v: any) => {
    let val = v || "";
    if (val === "null") val = "";
    if (typeof val === "object") val = JSON.stringify(val);
    return `'${String(val).replaceAll("'", "''")}'`;
  };

  for (const row of query.iterate()) {
    const [fileKey, fileContents] = await parseData(
      row,
      PrimaryKeys[tableName]
    );

    if (process.env.DEBUG === "true" && rowsParsed < 100) {
      fs.writeFileSync(
        path.join(distFolder, fileKey + ".json"),
        JSON.stringify(fileContents, null, 2),
        { encoding: "utf8" }
      );
    }

    targetDatabase.run(
      `REPLACE INTO ${tableName} (${Object.keys(fileContents).join(
        ", "
      )}) VALUES (${Object.keys(fileContents)
        .map((k) => mapValue(fileContents[k]))
        .join(", ")})`
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

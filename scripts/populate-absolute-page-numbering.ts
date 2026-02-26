import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.resolve(import.meta.dirname, "../data");

const OLD_DATA_RAW_DIR = path.resolve(DATA_DIR, "_old_", "raw");
const NEW_DATA_RAW_DIR = path.resolve(DATA_DIR, "raw");

const TABLE_NAMES = fs
  .readdirSync(OLD_DATA_RAW_DIR, { encoding: "utf8", withFileTypes: true })
  .filter((de) => de.isDirectory())
  .map((de) => de.name);

type RawTable = {
  tableName: string;
  columnNames: string[];
  rowData: string[][];
  pkName: string;
  pkStartValue: string;
  pkLastValue: string;
};

const getTableMetadata = (pageNumber: number, obj: RawTable) => {
  const pkIndex = obj.columnNames.indexOf(obj.pkName);
  if (pkIndex === -1)
    throw new Error(`Failed to get pk index of table ${obj.tableName}`);
  const [firstKey, lastKey] = [0, obj.rowData.length - 1].map(
    (i) => obj.rowData[i][pkIndex],
  );
  if (Number.isNaN(Number(firstKey))) {
    throw new Error(
      `First key not a number in page ${pageNumber} of ${obj.tableName}: ${firstKey}`,
    );
  }
  if (Number.isNaN(Number(lastKey))) {
    throw new Error(
      `Last key not a number in page ${pageNumber} of ${obj.tableName}: ${lastKey}`,
    );
  }
  const [fKey, lKey] = [firstKey, lastKey].map((n) => n.padStart(12, "0")); // 12 numbers need to be enough
  if (!fs.existsSync(path.resolve(NEW_DATA_RAW_DIR, obj.tableName))) {
    fs.mkdirSync(path.resolve(NEW_DATA_RAW_DIR, obj.tableName), {
      recursive: true,
    });
  }
  fs.copyFileSync(
    path.resolve(OLD_DATA_RAW_DIR, obj.tableName, `page_${pageNumber}.json`),
    path.resolve(NEW_DATA_RAW_DIR, obj.tableName, `page_${fKey}+${lKey}.json`),
  );
};

(async () => {
  await Promise.all(
    TABLE_NAMES.map(async (table) => {
      if (table === "SaliDBAanestysAsiakirja") {
        return; // KNOWN START PAGE ISSUE
      }
      for (let i = 1; i < 100_000_000; i++) {
        const cand = path.resolve(OLD_DATA_RAW_DIR, table, `page_${i}.json`);
        if (!fs.existsSync(cand)) {
          console.log("Row count in", table, "is", i - 1);
          break;
        }
        const file = JSON.parse(
          fs.readFileSync(cand, { encoding: "utf-8" }),
        ) as RawTable;
        getTableMetadata(i, file);
      }
    }),
  );
})();

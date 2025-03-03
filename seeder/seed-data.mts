import path from "path";
import fs from "fs";
import { SQL, TransactionSQL } from "bun";
import { TableNames } from "../constants/TableNames.mts";

const IMPORT_ORDER: Partial<Record<(typeof TableNames)[number], number>> = {
  MemberOfParliament: 0,
  SaliDBAanestys: 1,
  SaliDBAanestysEdustaja: 2,
};

const orderedTableNames = [...TableNames].sort(
  (a, b) =>
    (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
    (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER)
);

const db = new SQL(
  new URL("postgres://admin:secret@localhost:5432/eduskuntaforum")
);

const sql = await db.connect();

for (const tableName of orderedTableNames) {
  const pathToFile = path.resolve(import.meta.dirname, `${tableName}.mts`);
  if (!fs.existsSync(pathToFile)) {
    console.warn(`Seed fn for ${tableName} not found, skipping...`);
    continue;
  }
  const dataDir = path.resolve(
    import.meta.dirname,
    `../parser/data/${tableName}`
  );
  if (!fs.existsSync(dataDir)) {
    console.warn(`Data directory for ${tableName} not found, skipping...`);
    continue;
  }
  const entriesToImport = fs
    .readdirSync(dataDir, { encoding: "utf8", withFileTypes: true })
    .filter((s) => s.name.endsWith(".json") && s.name !== "meta.json")
    .map((s) => s.name);
  const { default: seedFn } = (await import(
    path.resolve(import.meta.dirname, `${tableName}.mts`)
  )) as {
    default: (sql: TransactionSQL) => (data: any) => Promise<void>;
  };
  console.time(`Seed ${tableName}`);
  console.log("Seeding", tableName);
  for (const entry of entriesToImport) {
    const { default: data } = await import(path.resolve(dataDir, entry), {
      with: { type: "json" },
    });
    await sql.begin(async (sql) => {
      await seedFn(sql)(data);
    });
  }
  console.timeEnd(`Seed ${tableName}`);
}

await sql.close();

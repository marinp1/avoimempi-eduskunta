import path from "path";
import fs from "fs";
import { Database } from "bun:sqlite";
import { TableNames } from "#constants/index";
import { getDatabasePath } from "#database";

/**
 * Make sure that data is imported in this order.
 * Non-existing table names are imported afterwards in undetermined order.
 */
const IMPORT_ORDER: Partial<Record<(typeof TableNames)[number], number>> = {
  MemberOfParliament: 0,
  SaliDBIstunto: 10,
  SaliDBKohta: 15,
  SaliDBAanestys: 20,
  SaliDBKohtaAanestys: 25,
  SaliDBAanestysEdustaja: 30,
};

/** Table names in import order. */
const orderedTableNames = [...TableNames].sort(
  (a, b) =>
    (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
    (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER)
);

/**
 * Reference to running DB instance.
 */
const db = new Database(getDatabasePath(), {
  create: false,
  readwrite: true,
});

const tables = db
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table';"
  )
  .all();

for (const table of tables) {
  const tableName = table.name;
  db.run(`DELETE FROM ${tableName};`);
}

// (Try to) migrate each table
for (const tableName of orderedTableNames) {
  /** Path to file containing seed functions. */
  const pathToFile = path.resolve(
    import.meta.dirname,
    `${tableName}/migrator.ts`
  );
  if (!fs.existsSync(pathToFile)) {
    console.warn(`Migration file for ${tableName} not found, skipping...`);
    continue;
  }
  /** Path to data directory containing all files to import. */
  const dataDir = path.resolve(
    import.meta.dirname,
    `../parser/data/${tableName}`
  );
  if (!fs.existsSync(dataDir)) {
    console.warn(`Data directory for ${tableName} not found, skipping...`);
    continue;
  }
  /** List of file names to import. */
  const entriesToImport = fs
    .readdirSync(dataDir, { encoding: "utf8", withFileTypes: true })
    .filter((s) => s.name.endsWith(".json") && s.name !== "meta.json")
    .map((s) => s.name);
  // Dynamically import the seed function.
  const { default: seedFn } = (await import(
    path.resolve(import.meta.dirname, `${tableName}/migrator.ts`)
  )) as {
    default: (sql: Database) => (data: any) => Promise<void>;
  };
  console.time(`Seed ${tableName}`);
  console.log("Seeding", tableName);
  // For each importable file, try to execute the seed function.
  for (const entry of entriesToImport) {
    const { default: data } = await import(path.resolve(dataDir, entry), {
      with: { type: "json" },
    });
    await seedFn(db)(data);
  }
  console.timeEnd(`Seed ${tableName}`);
}

db.close();

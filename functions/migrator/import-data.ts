import path from "path";
import fs from "fs";
import { Database } from "bun:sqlite";
import { TableNames } from "#constants/index";
import { getDatabasePath, getParsedDatabasePath } from "#database";
import { getMigrations, migrate } from "bun-sqlite-migrations";

/**
 * Make sure that data is imported in this order.
 * Non-existing table names are imported afterwards in undetermined order.
 */
const IMPORT_ORDER: Partial<Record<(typeof TableNames)[number], number>> = {
  MemberOfParliament: 0,
  SaliDBIstunto: 10,
  SaliDBKohta: 15,
  SaliDBAanestys: 20,
  SaliDBKohtaAanestys: 21,
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
const targetDatabase = new Database(getDatabasePath(), {
  create: true,
  readwrite: true,
});

const sourceDb = new Database(getParsedDatabasePath(), {
  create: false,
  readonly: true,
});

sourceDb.exec("PRAGMA journal_mode = WAL;");
targetDatabase.exec("PRAGMA journal_mode = WAL;");

const tables = targetDatabase
  .query<{ name: string }, []>(
    "SELECT name FROM sqlite_master WHERE type='table';"
  )
  .all();

migrate(
  targetDatabase,
  getMigrations(path.resolve(import.meta.dirname, "migrations"))
);

// Clear ALL tables
for (const table of tables) {
  const tableName = table.name;
  targetDatabase.run(`DELETE FROM ${tableName};`);
}

// MIGRATE

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

  // Dynamically import the seed function.
  const { default: createMigrator } = (await import(
    path.resolve(import.meta.dirname, `${tableName}/migrator.ts`)
  )) as {
    default: (sql: Database) => (data: any) => Promise<void>;
  };

  console.time(`Seed ${tableName}`);
  console.log("Seeding", tableName);
  const query = sourceDb.prepare<any[], []>(`SELECT * FROM ${tableName}`);
  const migrate = createMigrator(targetDatabase);
  for (const row of query.iterate()) {
    targetDatabase.exec("BEGIN TRANSACTION;");
    await migrate(row);
    targetDatabase.exec("COMMIT;");
  }
  console.timeEnd(`Seed ${tableName}`);
}

sourceDb.close();
targetDatabase.close();

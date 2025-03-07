import path from "path";
import fs from "fs";
import { SQL, type TransactionSQL } from "bun";
import { TableNames } from "avoimempi-eduskunta-common/constants/TableNames.mts";

/**
 * Make sure that data is imported in this order.
 * Non-existing table names are imported afterwards in undetermined order.
 */
const IMPORT_ORDER: Partial<Record<(typeof TableNames)[number], number>> = {
  MemberOfParliament: 0,
  SaliDBAanestys: 1,
  SaliDBAanestysEdustaja: 2,
};

/** Table names in import order. */
const orderedTableNames = [...TableNames].sort(
  (a, b) =>
    (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
    (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER)
);

/**
 * Reference to running DB instance.
 * TODO: Use env paramters instead of hardcoded values.
 */
const db = new SQL(
  new URL(
    `postgres://${process.env.POSTGRES_USER}:${process.env.POSTGRES_PASSWORD}@${
      process.env.POSTGRES_HOST ?? "localhost"
    }:5432/${process.env.POSTGRES_DB}`
  )
);

/** Database connection. */
const sql = await db.connect();

/** Truncate all tables in the database. */
await sql`
DO $$ DECLARE
  r RECORD;
BEGIN
  FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname =current_schema()) LOOP
    EXECUTE 'TRUNCATE TABLE ' || quote_ident(r.tablename) || ' CASCADE';
  END LOOP;
END $$;
`;

// (Try to) migrate each table
for (const tableName of orderedTableNames) {
  /** Path to file containing seed functions. */
  const pathToFile = path.resolve(
    import.meta.dirname,
    `${tableName}/migrator.mts`
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
    path.resolve(import.meta.dirname, `${tableName}/migrator.mts`)
  )) as {
    default: (sql: TransactionSQL) => (data: any) => Promise<void>;
  };
  console.time(`Seed ${tableName}`);
  console.log("Seeding", tableName);
  // For each importable file, try to execute the seed function.
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

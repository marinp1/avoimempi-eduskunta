import sqlite, { type Database } from "bun:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getMigrations } from "bun-sqlite-migrations";
import { type TableName, TableNames } from "#constants/index";
import {
  buildConsolidatedMigrationReport,
  type ConsolidatedMigrationReport,
  type ConsolidatedMigrationStatus,
  writeConsolidatedMigrationReport,
} from "./reporting";
import { clearStatementCache, objectExists } from "./utils";
import { TABLE_MIGRATORS } from "./table-migrators";
import { migrateVaskiData } from "./VaskiData/migrator";
import {
  normalizeImportedTextData,
  rebuildFederatedSearchIndex,
  rebuildPersonSpeechDailyStats,
  rebuildPersonVotingDailyStats,
  rebuildVotingPartyStats,
} from "./post-import";
import { getDatabasePath, getTraceDatabasePath } from "#database";
import { getStorage } from "#storage";
import { getParsedRowStore } from "#storage/row-store/factory";

// ---------------------------------------------------------------------------
// Inlined SQL constants (from server/database/sql-statements — not importable
// from datapipe due to package boundary)
// ---------------------------------------------------------------------------

const SQLITE_PRAGMAS = {
  journalWal: "PRAGMA journal_mode = WAL;",
  queryOnlyOn: "PRAGMA query_only = ON;",
  foreignKeysOff: "PRAGMA foreign_keys = OFF;",
  synchronousOff: "PRAGMA synchronous = OFF;",
  synchronousFull: "PRAGMA synchronous = FULL;",
  cacheSize64Mb: "PRAGMA cache_size = -64000;",
  tempStoreMemory: "PRAGMA temp_store = MEMORY;",
  mmapSize30Gb: "PRAGMA mmap_size = 30000000000;",
  lockingModeExclusive: "PRAGMA locking_mode = EXCLUSIVE;",
  lockingModeNormal: "PRAGMA locking_mode = NORMAL;",
} as const;

const MIGRATOR_SQL = {
  listTables: "SELECT name FROM sqlite_master WHERE type='table';",
  beginTransaction: "BEGIN TRANSACTION;",
  commit: "COMMIT;",
  rollback: "ROLLBACK;",
  createMigrationInfoTable:
    "CREATE TABLE IF NOT EXISTS _migration_info (key TEXT PRIMARY KEY, value TEXT);",
  upsertMigrationTimestamp:
    "INSERT OR REPLACE INTO _migration_info (key, value) VALUES ('last_migration', ?);",
} as const;

function escapeSqliteIdentifier(identifier: string): string {
  return identifier.replaceAll('"', '""');
}

function getDeleteAllRowsQuery(tableName: string): string {
  return `DELETE FROM "${escapeSqliteIdentifier(tableName)}";`;
}

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface MigratorMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

export interface MigrationOptions {
  onMessage?: (message: MigratorMessage) => void;
  shouldStop?: () => boolean;
}

// ---------------------------------------------------------------------------
// Internal types
// ---------------------------------------------------------------------------

type SqlMigration = {
  version: number;
  up: string[];
  down: string;
};

type SourceReferenceMode = "full" | "summary" | "off";

type ParsedPageBatch = {
  firstPk: number;
  rows: any[];
  pkName: string | null;
  sourceTable: TableName;
  sourcePage: number | null;
  scrapedAt: string | null;
};

type SourceReferenceFallback = {
  sourceTable: TableName;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: unknown;
  scrapedAt: string | null;
};

type SourceReference = {
  sourceTable: TableName;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: string | null;
  scrapedAt: string | null;
};

type ImportSourceReferenceSummary = {
  importedRows: number;
  distinctPages: Set<string>;
  firstScrapedAt: string | null;
  lastScrapedAt: string | null;
  firstMigratedAt: string | null;
  lastMigratedAt: string | null;
};

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/**
 * Import order for tables to respect foreign key constraints
 */
const IMPORT_ORDER: Partial<Record<string, number>> = {
  MemberOfParliament: 0,
  SaliDBIstunto: 10,
  SaliDBKohta: 15,
  SaliDBPuheenvuoro: 16,
  SaliDBAanestys: 20,
  SaliDBKohtaAanestys: 21,
  SaliDBKohtaAsiakirja: 22,
  SaliDBTiedote: 23,
  SaliDBAanestysEdustaja: 30,
};

const DISABLED_IMPORT_TABLES = new Set<string>([
  "SaliDBAanestysAsiakirja",
  "SaliDBAanestysJakauma",
]);

const IMPORT_METADATA_FIELDS = {
  sourceTable: "__sourceTable",
  sourcePage: "__sourcePage",
  scrapedAt: "__sourceScrapedAt",
  sourcePrimaryKeyName: "__sourcePrimaryKeyName",
  sourcePrimaryKeyValue: "__sourcePrimaryKeyValue",
} as const;

const MIGRATION_RUN_REPORTS_STORAGE_PREFIX = "metadata/migration-runs";
const MIGRATION_RUN_LATEST_STORAGE_KEY = `${MIGRATION_RUN_REPORTS_STORAGE_PREFIX}/latest.json`;
const MIGRATION_RUN_LATEST_SUCCESS_STORAGE_KEY = `${MIGRATION_RUN_REPORTS_STORAGE_PREFIX}/latest-success.json`;
const SQLITE_ARTIFACTS_STORAGE_PREFIX = "artifacts/sqlite";
const SQLITE_LATEST_MANIFEST_STORAGE_KEY = `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/latest/manifest.json`;

// ---------------------------------------------------------------------------
// SQL migration helpers
// ---------------------------------------------------------------------------

const getDatabaseVersion = (db: Database): number => {
  const row = db.query("PRAGMA user_version;").get() as
    | { user_version?: number }
    | undefined;
  return row?.user_version ?? 0;
};

const setDatabaseVersion = (db: Database, version: number): void => {
  db.exec(`PRAGMA user_version = ${version}`);
};

const unquoteIdentifier = (identifier: string): string => {
  const trimmed = identifier.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("`") && trimmed.endsWith("`")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    return trimmed.substring(1, trimmed.length - 1);
  }
  return trimmed;
};

const hasColumn = (
  db: Database,
  tableName: string,
  columnName: string,
): boolean => {
  const escaped = tableName.replace(/'/g, "''");
  const rows = db.query(`PRAGMA table_info('${escaped}')`).all() as Array<{
    name?: string;
  }>;
  return rows.some((row) => row.name === columnName);
};

const shouldSkipStatement = (
  db: Database,
  statement: string,
): { skip: boolean; reason?: string } => {
  const sql = statement.trim();
  if (!sql) return { skip: true, reason: "empty statement" };

  const normalized = sql.replace(/\s+/g, " ").trim();

  const alterAddColumn = normalized.match(
    /^ALTER TABLE\s+([`"[\]\w.]+)\s+ADD COLUMN\s+([`"[\]\w.]+)/i,
  );
  if (alterAddColumn) {
    const tableName = unquoteIdentifier(alterAddColumn[1]);
    const columnName = unquoteIdentifier(alterAddColumn[2]);
    if (hasColumn(db, tableName, columnName)) {
      return {
        skip: true,
        reason: `column ${tableName}.${columnName} already exists`,
      };
    }
    return { skip: false };
  }

  const createVirtualTable = normalized.match(
    /^CREATE VIRTUAL TABLE(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createVirtualTable) {
    const tableName = unquoteIdentifier(createVirtualTable[1]);
    if (objectExists(db, "table", tableName)) {
      return {
        skip: true,
        reason: `virtual table ${tableName} already exists`,
      };
    }
    return { skip: false };
  }

  const createTrigger = normalized.match(
    /^CREATE TRIGGER(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createTrigger) {
    const triggerName = unquoteIdentifier(createTrigger[1]);
    if (objectExists(db, "trigger", triggerName)) {
      return {
        skip: true,
        reason: `trigger ${triggerName} already exists`,
      };
    }
    return { skip: false };
  }

  const createIndex = normalized.match(
    /^CREATE INDEX(?: IF NOT EXISTS)?\s+([`"[\]\w.]+)/i,
  );
  if (createIndex) {
    const indexName = unquoteIdentifier(createIndex[1]);
    if (objectExists(db, "index", indexName)) {
      return {
        skip: true,
        reason: `index ${indexName} already exists`,
      };
    }
    return { skip: false };
  }

  return { skip: false };
};

const applyMigrationsSafely = (
  db: Database,
  migrations: SqlMigration[],
): void => {
  const orderedMigrations = [...migrations].sort(
    (a, b) => a.version - b.version,
  );
  if (orderedMigrations.length === 0) {
    return;
  }

  const maxVersion = orderedMigrations[orderedMigrations.length - 1].version;
  let currentVersion = getDatabaseVersion(db);

  if (currentVersion > maxVersion) {
    throw new Error(
      `Database version ${currentVersion} is newer than available migrations (${maxVersion})`,
    );
  }

  for (const migration of orderedMigrations) {
    if (migration.version <= currentVersion) {
      continue;
    }

    const runUpgrade = db.transaction(() => {
      for (const statement of migration.up) {
        const skipCheck = shouldSkipStatement(db, statement);
        if (skipCheck.skip) {
          console.log(
            `  Skipping v${migration.version} statement: ${skipCheck.reason ?? "already applied"}`,
          );
          continue;
        }

        try {
          db.run(statement);
        } catch (error) {
          const snippet =
            statement
              .split("\n")
              .map((line) => line.trim())
              .find(Boolean) ?? statement;
          throw new Error(
            `Migration v${migration.version} failed on statement "${snippet}": ${String(error)}`,
          );
        }
      }
      setDatabaseVersion(db, migration.version);
    });

    runUpgrade.immediate();
    currentVersion = migration.version;
  }
};

const getVirtualTableNames = (db: Database): Set<string> => {
  const rows = db
    .query<{ name: string }, []>(
      "SELECT name FROM sqlite_master WHERE type='table' AND sql LIKE 'CREATE VIRTUAL TABLE%';",
    )
    .all();
  return new Set(rows.map((row) => row.name));
};

const shouldSkipTableClear = (
  tableName: string,
  virtualTableNames: Set<string>,
): boolean => {
  if (tableName === "sqlite_sequence" || tableName === "_bun_migrations") {
    return true;
  }

  if (tableName.startsWith("sqlite_")) {
    return true;
  }

  if (virtualTableNames.has(tableName)) {
    return true;
  }

  for (const virtualName of virtualTableNames) {
    if (tableName.startsWith(`${virtualName}_`)) {
      return true;
    }
  }

  return false;
};

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

const normalizeStoragePath = (value: string): string =>
  value.replace(/\\/g, "/").replace(/^\/+/, "");

const listJsonFilesRecursive = (baseDir: string): string[] => {
  if (!fs.existsSync(baseDir)) return [];

  const files: string[] = [];
  const stack: string[] = [baseDir];

  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;

    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && entry.name.endsWith(".json")) {
        files.push(fullPath);
      }
    }
  }

  return files.sort((a, b) => a.localeCompare(b));
};

const isTruthyEnv = (value: string | undefined): boolean => {
  if (!value) return false;
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes";
};

const isPromiseLike = (value: unknown): value is PromiseLike<unknown> =>
  !!value && typeof (value as { then?: unknown }).then === "function";

const parsePositiveInt = (
  value: string | undefined,
  fallback: number,
): number => {
  const parsed = Number.parseInt(value ?? "", 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseOptionalPositiveInt = (
  value: string | undefined,
  fallback: number | null,
): number | null => {
  if (!value || value.trim() === "") return fallback;

  const normalized = value.trim().toLowerCase();
  if (normalized === "off" || normalized === "none" || normalized === "full") {
    return null;
  }

  const parsed = Number.parseInt(normalized, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseSourceReferenceMode = (
  value: string | undefined,
): SourceReferenceMode => {
  const normalized = (value ?? "summary").trim().toLowerCase();
  if (normalized === "full") return "full";
  if (normalized === "off") return "off";
  return "summary";
};

const isNotADatabaseError = (error: unknown): boolean => {
  const text = String(error).toLowerCase();
  return text.includes("sqlite_notadb") || text.includes("not a database");
};

const normalizeText = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized === "" ? null : normalized;
};

const normalizeNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number.parseInt(value, 10);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
};

const normalizeSourceReference = (
  row: Record<string, any>,
  fallback: SourceReferenceFallback,
): SourceReference => {
  const sourceTable = (normalizeText(row[IMPORT_METADATA_FIELDS.sourceTable]) ??
    fallback.sourceTable) as TableName;
  const sourcePage =
    normalizeNumber(row[IMPORT_METADATA_FIELDS.sourcePage]) ??
    fallback.sourcePage;
  const sourcePkName =
    normalizeText(row[IMPORT_METADATA_FIELDS.sourcePrimaryKeyName]) ??
    fallback.sourcePkName;

  const fallbackPkValue =
    sourcePkName && row[sourcePkName] !== undefined
      ? row[sourcePkName]
      : fallback.sourcePkValue;
  const sourcePkValueRaw =
    row[IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue] ?? fallbackPkValue;
  const sourcePkValue =
    sourcePkValueRaw === null || sourcePkValueRaw === undefined
      ? null
      : String(sourcePkValueRaw);

  const scrapedAt =
    normalizeText(row[IMPORT_METADATA_FIELDS.scrapedAt]) ?? fallback.scrapedAt;

  return {
    sourceTable,
    sourcePage,
    sourcePkName,
    sourcePkValue,
    scrapedAt,
  };
};

// ---------------------------------------------------------------------------
// Table ordering
// ---------------------------------------------------------------------------

function getOrderedTables(): TableName[] {
  return [...(TableNames as unknown as TableName[])].sort(
    (a, b) =>
      (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
      (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
  );
}

async function getTablesWithParsedData(): Promise<TableName[]> {
  const allTables = getOrderedTables().filter(
    (tableName) => !DISABLED_IMPORT_TABLES.has(tableName),
  );

  const parsedStore = getParsedRowStore();
  const tablesInDb = new Set(await parsedStore.tableNames());
  return allTables.filter((tableName) => tablesInDb.has(tableName));
}

// ---------------------------------------------------------------------------
// Parsed data reader
// ---------------------------------------------------------------------------

async function* readParsedData(
  tableName: string,
): AsyncGenerator<ParsedPageBatch> {
  const parsedStore = getParsedRowStore();
  const BATCH_SIZE = 100;
  let batch: any[] = [];
  let firstBatchPk: number | null = null;

  for await (const storedRow of parsedStore.list(tableName)) {
    const rowData = JSON.parse(storedRow.data);
    if (firstBatchPk === null) firstBatchPk = storedRow.pk;
    batch.push(rowData);

    if (batch.length >= BATCH_SIZE) {
      yield {
        firstPk: firstBatchPk,
        rows: batch,
        pkName: normalizeText(
          batch[0][IMPORT_METADATA_FIELDS.sourcePrimaryKeyName],
        ),
        sourceTable: (normalizeText(
          batch[0][IMPORT_METADATA_FIELDS.sourceTable],
        ) ?? tableName) as TableName,
        sourcePage: normalizeNumber(
          batch[0][IMPORT_METADATA_FIELDS.sourcePage],
        ),
        scrapedAt: normalizeText(batch[0][IMPORT_METADATA_FIELDS.scrapedAt]),
      };
      batch = [];
      firstBatchPk = null;
    }
  }

  if (batch.length > 0 && firstBatchPk !== null) {
    yield {
      firstPk: firstBatchPk,
      rows: batch,
      pkName: normalizeText(
        batch[0][IMPORT_METADATA_FIELDS.sourcePrimaryKeyName],
      ),
      sourceTable: (normalizeText(
        batch[0][IMPORT_METADATA_FIELDS.sourceTable],
      ) ?? tableName) as TableName,
      sourcePage: normalizeNumber(batch[0][IMPORT_METADATA_FIELDS.sourcePage]),
      scrapedAt: normalizeText(batch[0][IMPORT_METADATA_FIELDS.scrapedAt]),
    };
  }
}

// ---------------------------------------------------------------------------
// Storage publishing
// ---------------------------------------------------------------------------

async function publishMigrationRunReports(params: {
  runId: string;
  localRootDir: string;
  status: ConsolidatedMigrationStatus;
  startedAt: string;
  finishedAt: string;
  consolidatedReport: ConsolidatedMigrationReport | null;
  migrationError: string | null;
}): Promise<void> {
  const storage = getStorage();
  const runStoragePrefix = `${MIGRATION_RUN_REPORTS_STORAGE_PREFIX}/${params.runId}`;
  const localFiles = listJsonFilesRecursive(params.localRootDir);
  const uploadedKeys: string[] = [];

  for (const localFilePath of localFiles) {
    const relativePath = normalizeStoragePath(
      path.relative(params.localRootDir, localFilePath),
    );
    const storageKey = `${runStoragePrefix}/${relativePath}`;
    const payload = fs.readFileSync(localFilePath, "utf8");
    await storage.put(storageKey, payload);
    uploadedKeys.push(storageKey);
  }

  const pointerPayload = {
    runId: params.runId,
    status: params.status,
    startedAt: params.startedAt,
    finishedAt: params.finishedAt,
    reportKey: `${runStoragePrefix}/consolidated-report.json`,
    artifactPrefix: runStoragePrefix,
    artifactCount: uploadedKeys.length,
    totals: params.consolidatedReport?.totals ?? null,
    files: params.consolidatedReport?.files ?? null,
    error: params.migrationError,
  };

  await storage.put(
    MIGRATION_RUN_LATEST_STORAGE_KEY,
    JSON.stringify(pointerPayload, null, 2),
  );

  if (params.status === "success") {
    await storage.put(
      MIGRATION_RUN_LATEST_SUCCESS_STORAGE_KEY,
      JSON.stringify(pointerPayload, null, 2),
    );
  }

  console.log(
    `📦 Uploaded migration reports to storage '${storage.name}' at ${runStoragePrefix}`,
  );
}

async function publishLatestDatabaseArtifact(params: {
  runId: string;
  migratedAt: string;
}): Promise<void> {
  const storage = getStorage();
  const databasePath = getDatabasePath();
  const traceDatabasePath = getTraceDatabasePath();
  const databaseFileName = path.basename(databasePath);
  const traceDatabaseFileName = path.basename(traceDatabasePath);
  const artifactKey = `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/latest/${databaseFileName}`;
  const traceArtifactKey = `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/latest/${traceDatabaseFileName}`;
  const shouldPublishSnapshot = isTruthyEnv(
    process.env.MIGRATOR_PUBLISH_SNAPSHOT,
  );

  if (!fs.existsSync(databasePath)) {
    throw new Error(`SQLite database file not found at '${databasePath}'`);
  }

  if (typeof storage.putFile !== "function") {
    throw new Error(
      `Storage provider '${storage.name}' does not implement putFile(); required for large SQLite artifact uploads`,
    );
  }

  await storage.putFile(artifactKey, databasePath);

  const snapshotKey = shouldPublishSnapshot
    ? `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/snapshots/${params.runId}/${databaseFileName}`
    : null;
  const traceSnapshotKey = shouldPublishSnapshot
    ? `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/snapshots/${params.runId}/${traceDatabaseFileName}`
    : null;
  if (snapshotKey) {
    await storage.putFile(snapshotKey, databasePath);
  }
  const hasTraceDatabase = fs.existsSync(traceDatabasePath);
  if (hasTraceDatabase) {
    await storage.putFile(traceArtifactKey, traceDatabasePath);
    if (traceSnapshotKey) {
      await storage.putFile(traceSnapshotKey, traceDatabasePath);
    }
  }

  const stats = fs.statSync(databasePath);
  const manifest = {
    runId: params.runId,
    migratedAt: params.migratedAt,
    storageProvider: storage.name,
    dbArtifactKey: artifactKey,
    snapshotKey,
    traceDbArtifactKey: hasTraceDatabase ? traceArtifactKey : null,
    traceSnapshotKey: hasTraceDatabase ? traceSnapshotKey : null,
    dbFileName: databaseFileName,
    dbSizeBytes: stats.size,
    traceDbFileName: hasTraceDatabase ? traceDatabaseFileName : null,
    traceDbSizeBytes: hasTraceDatabase
      ? fs.statSync(traceDatabasePath).size
      : null,
    updatedAt: new Date().toISOString(),
  };

  await storage.put(
    SQLITE_LATEST_MANIFEST_STORAGE_KEY,
    JSON.stringify(manifest, null, 2),
  );

  console.log(
    `🧱 Published SQLite artifact to storage '${storage.name}' at ${artifactKey}`,
  );
}

// ---------------------------------------------------------------------------
// Foreign key check
// ---------------------------------------------------------------------------

function runForeignKeyCheck(
  db: Database,
  sampleLimit: number,
): {
  checkedAt: string;
  totalViolations: number;
  sampleLimit: number;
  sampleViolations: Array<{
    childTable: string;
    rowid: number | null;
    parentTable: string;
    foreignKeyIndex: number;
  }>;
} {
  const safeSampleLimit = Math.max(1, sampleLimit);
  const totalRow = db
    .query<{ count: number }, []>(
      "SELECT COUNT(*) AS count FROM pragma_foreign_key_check",
    )
    .get();
  const sampleViolations = db
    .query<
      {
        childTable: string;
        rowid: number | null;
        parentTable: string;
        foreignKeyIndex: number;
      },
      []
    >(
      `SELECT "table" AS childTable, rowid, parent AS parentTable, fkid AS foreignKeyIndex
       FROM pragma_foreign_key_check
       LIMIT ${safeSampleLimit}`,
    )
    .all();

  return {
    checkedAt: new Date().toISOString(),
    totalViolations: totalRow?.count ?? 0,
    sampleLimit: safeSampleLimit,
    sampleViolations,
  };
}

// ---------------------------------------------------------------------------
// Import source reference tracking
// ---------------------------------------------------------------------------

function updateImportSourceReferenceSummary(
  summaries: Map<string, ImportSourceReferenceSummary>,
  sourceReference: SourceReference,
  migratedAt: string,
): void {
  const sourceTable = sourceReference.sourceTable;
  if (!sourceTable) return;

  let summary = summaries.get(sourceTable);
  if (!summary) {
    summary = {
      importedRows: 0,
      distinctPages: new Set<string>(),
      firstScrapedAt: null,
      lastScrapedAt: null,
      firstMigratedAt: null,
      lastMigratedAt: null,
    };
    summaries.set(sourceTable, summary);
  }

  summary.importedRows += 1;

  if (
    sourceReference.sourcePage !== null &&
    sourceReference.sourcePage !== undefined
  ) {
    summary.distinctPages.add(String(sourceReference.sourcePage));
  }

  if (sourceReference.scrapedAt) {
    if (
      !summary.firstScrapedAt ||
      sourceReference.scrapedAt < summary.firstScrapedAt
    ) {
      summary.firstScrapedAt = sourceReference.scrapedAt;
    }
    if (
      !summary.lastScrapedAt ||
      sourceReference.scrapedAt > summary.lastScrapedAt
    ) {
      summary.lastScrapedAt = sourceReference.scrapedAt;
    }
  }

  if (!summary.firstMigratedAt || migratedAt < summary.firstMigratedAt) {
    summary.firstMigratedAt = migratedAt;
  }
  if (!summary.lastMigratedAt || migratedAt > summary.lastMigratedAt) {
    summary.lastMigratedAt = migratedAt;
  }
}

function persistImportSourceReferenceSummaries(
  db: Database,
  summaries: Map<string, ImportSourceReferenceSummary>,
): void {
  if (!objectExists(db, "table", "ImportSourceReferenceSummary")) {
    return;
  }

  const persistTransaction = db.transaction(() => {
    db.run("DELETE FROM ImportSourceReferenceSummary");
    const stmt = db.prepare(
      `INSERT INTO ImportSourceReferenceSummary (
         source_table,
         imported_rows,
         distinct_pages,
         first_scraped_at,
         last_scraped_at,
         first_migrated_at,
         last_migrated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    );

    for (const [sourceTable, summary] of summaries.entries()) {
      stmt.run(
        sourceTable,
        summary.importedRows,
        summary.distinctPages.size,
        summary.firstScrapedAt,
        summary.lastScrapedAt,
        summary.firstMigratedAt,
        summary.lastMigratedAt,
      );
    }

    stmt.finalize();
  });

  persistTransaction.immediate();
}

// ---------------------------------------------------------------------------
// Trace database management
// ---------------------------------------------------------------------------

function ensureImportTraceSchema(db: Database): void {
  db.run(
    `CREATE TABLE IF NOT EXISTS ImportSourceReference (
       id INTEGER PRIMARY KEY,
       source_table TEXT NOT NULL,
       source_page INTEGER,
       source_pk_name TEXT,
       source_pk_value TEXT,
       scraped_at TEXT,
       migrated_at TEXT NOT NULL
     )`,
  );
  db.run(
    `CREATE TABLE IF NOT EXISTS ImportSourceReferenceSummary (
       source_table TEXT PRIMARY KEY,
       imported_rows INTEGER NOT NULL DEFAULT 0,
       distinct_pages INTEGER NOT NULL DEFAULT 0,
       first_scraped_at TEXT,
       last_scraped_at TEXT,
       first_migrated_at TEXT,
       last_migrated_at TEXT
     )`,
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_import_source_reference_lookup ON ImportSourceReference(source_table, source_pk_name, source_pk_value)",
  );
  db.run(
    "CREATE INDEX IF NOT EXISTS idx_import_source_reference_source_table ON ImportSourceReference(source_table)",
  );
}

function clearImportTraceData(db: Database): void {
  if (objectExists(db, "table", "ImportSourceReferenceSummary")) {
    db.run("DELETE FROM ImportSourceReferenceSummary");
  }
  if (objectExists(db, "table", "ImportSourceReference")) {
    db.run("DELETE FROM ImportSourceReference");
  }
}

function configureTraceDatabase(db: Database): void {
  db.exec(SQLITE_PRAGMAS.journalWal);
  db.exec(SQLITE_PRAGMAS.synchronousOff);
  db.exec(SQLITE_PRAGMAS.cacheSize64Mb);
  db.exec(SQLITE_PRAGMAS.tempStoreMemory);
  db.exec(SQLITE_PRAGMAS.mmapSize30Gb);
}

function openTraceDatabaseForMigration(traceDatabasePath: string): Database {
  fs.mkdirSync(path.dirname(traceDatabasePath), { recursive: true });

  let traceDb: Database | null = null;
  try {
    traceDb = sqlite.open(traceDatabasePath, {
      create: true,
      readwrite: true,
    });
    configureTraceDatabase(traceDb);
    return traceDb;
  } catch (error) {
    if (traceDb) {
      try {
        traceDb.close();
      } catch (_closeError) {
        // best effort
      }
    }

    if (!isNotADatabaseError(error)) {
      throw error;
    }

    const backupPath = `${traceDatabasePath}.invalid-${Date.now()}`;
    try {
      if (fs.existsSync(traceDatabasePath)) {
        fs.renameSync(traceDatabasePath, backupPath);
        console.warn(
          `⚠️  Trace database is invalid, moved to '${backupPath}' and recreating...`,
        );
      }
    } catch (_renameError) {
      fs.rmSync(traceDatabasePath, { force: true });
      console.warn(
        `⚠️  Trace database is invalid and could not be renamed, deleting and recreating '${traceDatabasePath}'...`,
      );
    }

    const recreatedTraceDb = sqlite.open(traceDatabasePath, {
      create: true,
      readwrite: true,
    });
    configureTraceDatabase(recreatedTraceDb);
    return recreatedTraceDb;
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run database migration from parsed storage.
 *
 * This function is pure (no singleton state, no WebSocket, no maintenance
 * lock). Progress is reported via the optional `onMessage` callback. The
 * caller may request a stop by returning `true` from `shouldStop`.
 */
export async function runMigration(options?: MigrationOptions): Promise<void> {
  const checkStop = () => options?.shouldStop?.() ?? false;
  const onMessage = (msg: MigratorMessage) => options?.onMessage?.(msg);

  onMessage({
    type: "status",
    data: {
      status: "started",
      message: "Starting database migration",
    },
  });

  const reportStartedAt = new Date().toISOString();
  const reportRunId = reportStartedAt.replace(/[:.]/g, "-");
  const reportRootDir = path.join(
    os.tmpdir(),
    "avoimempi-eduskunta",
    "migration-run-reports",
    reportRunId,
  );
  const reportDirs = {
    reports: path.join(reportRootDir, "reports"),
    overwrites: path.join(reportRootDir, "overwrites"),
    knownIssues: path.join(reportRootDir, "known-issues"),
  };

  const previousReportEnv = {
    report: process.env.MIGRATOR_REPORT_LOG_DIR,
    overwrite: process.env.MIGRATOR_OVERWRITE_LOG_DIR,
    knownIssue: process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR,
  };

  process.env.MIGRATOR_REPORT_LOG_DIR = reportDirs.reports;
  process.env.MIGRATOR_OVERWRITE_LOG_DIR = reportDirs.overwrites;
  process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR = reportDirs.knownIssues;

  let migrationStatus: ConsolidatedMigrationStatus = "failed";
  let migrationError: string | null = null;
  let consolidatedReport: ConsolidatedMigrationReport | null = null;
  let traceDatabase: Database | null = null;
  let traceTransactionOpen = false;
  let sourceReferenceStatement: {
    run: (...args: any[]) => unknown;
    finalize: () => void;
  } | null = null;
  const useExclusiveLock = isTruthyEnv(process.env.MIGRATOR_EXCLUSIVE_LOCK);
  const doRunForeignKeyCheck = isTruthyEnv(
    process.env.MIGRATOR_FOREIGN_KEY_CHECK,
  );
  const foreignKeyCheckSampleLimit = parsePositiveInt(
    process.env.MIGRATOR_FOREIGN_KEY_CHECK_SAMPLE_LIMIT,
    1000,
  );
  const shouldVacuumAfterImport =
    process.env.MIGRATOR_VACUUM_AFTER_IMPORT === undefined
      ? true
      : isTruthyEnv(process.env.MIGRATOR_VACUUM_AFTER_IMPORT);
  const federatedSearchBodyMaxChars = parseOptionalPositiveInt(
    process.env.MIGRATOR_FEDERATED_SEARCH_BODY_MAX_CHARS,
    4096,
  );

  try {
    // Get tables with parsed data
    const tablesToImport = await getTablesWithParsedData();

    if (tablesToImport.length === 0) {
      throw new Error("No parsed data found to migrate");
    }

    onMessage({
      type: "progress",
      data: {
        message: `Found ${tablesToImport.length} tables to import`,
        currentTable: null,
        tablesCompleted: 0,
        totalTables: tablesToImport.length,
      },
    });

    // Open target database
    const targetDatabase = sqlite.open(getDatabasePath(), {
      create: true,
      readwrite: true,
    });

    targetDatabase.exec(SQLITE_PRAGMAS.journalWal);

    // Apply performance optimizations for bulk inserts
    console.log("⚙️  Applying SQLite performance optimizations...");
    targetDatabase.exec(SQLITE_PRAGMAS.synchronousOff);
    targetDatabase.exec(SQLITE_PRAGMAS.cacheSize64Mb);
    targetDatabase.exec(SQLITE_PRAGMAS.tempStoreMemory);
    targetDatabase.exec(SQLITE_PRAGMAS.mmapSize30Gb);
    targetDatabase.exec(SQLITE_PRAGMAS.foreignKeysOff);
    if (useExclusiveLock) {
      targetDatabase.exec(SQLITE_PRAGMAS.lockingModeExclusive);
    }

    // Run schema migrations
    const migrationsPath = path.resolve(import.meta.dirname, "migrations");
    console.log("🔄 Running database migrations...");
    applyMigrationsSafely(
      targetDatabase,
      getMigrations(migrationsPath) as SqlMigration[],
    );
    console.log("✅ Migrations completed");

    // Clear all tables
    console.log("🗑️  Clearing existing data...");
    const tables = targetDatabase
      .query<{ name: string }, []>(MIGRATOR_SQL.listTables)
      .all();
    const virtualTableNames = getVirtualTableNames(targetDatabase);

    for (const table of tables) {
      if (shouldSkipTableClear(table.name, virtualTableNames)) {
        continue;
      }

      console.log(`  Clearing ${table.name}...`);
      targetDatabase.run(getDeleteAllRowsQuery(table.name));
    }
    console.log("✅ Tables cleared");

    // Clear prepared statement cache before starting
    clearStatementCache();
    const sourceReferenceMode = parseSourceReferenceMode(
      process.env.MIGRATOR_SOURCE_REFERENCE_MODE,
    );
    console.log(
      `🧾 Source reference mode: ${sourceReferenceMode} (${sourceReferenceMode === "full" ? "store detailed rows + summary" : sourceReferenceMode === "summary" ? "store summary only" : "skip source reference storage"})`,
    );
    const traceDatabasePath = getTraceDatabasePath();
    console.log(`🧾 Trace database: ${traceDatabasePath}`);
    console.log(
      `🔎 Federated search body limit: ${federatedSearchBodyMaxChars === null ? "unlimited" : `${federatedSearchBodyMaxChars} chars`}`,
    );

    if (sourceReferenceMode !== "off") {
      traceDatabase = openTraceDatabaseForMigration(traceDatabasePath);
      ensureImportTraceSchema(traceDatabase);
      traceDatabase.exec(MIGRATOR_SQL.beginTransaction);
      traceTransactionOpen = true;
      clearImportTraceData(traceDatabase);
    }

    const sourceReferenceSummaries = new Map<
      string,
      ImportSourceReferenceSummary
    >();

    sourceReferenceStatement =
      sourceReferenceMode === "full"
        ? (traceDatabase?.prepare(
            `INSERT INTO ImportSourceReference (
               source_table,
               source_page,
               source_pk_name,
               source_pk_value,
               scraped_at,
               migrated_at
             ) VALUES (?, ?, ?, ?, ?, ?)`,
          ) ?? null)
        : null;

    const recordSourceReference = (
      row: Record<string, any>,
      fallback: SourceReferenceFallback,
    ) => {
      const sourceReference = normalizeSourceReference(row, fallback);
      if (sourceReferenceMode !== "off") {
        updateImportSourceReferenceSummary(
          sourceReferenceSummaries,
          sourceReference,
          reportStartedAt,
        );
      }

      if (!sourceReferenceStatement) return;

      sourceReferenceStatement.run(
        sourceReference.sourceTable,
        sourceReference.sourcePage,
        sourceReference.sourcePkName,
        sourceReference.sourcePkValue,
        sourceReference.scrapedAt,
        reportStartedAt,
      );
    };

    // Import each table
    let tablesCompleted = 0;
    const startTime = Date.now();

    for (const tableName of tablesToImport) {
      if (checkStop()) {
        throw new Error("Migration stopped by user");
      }

      const tableStartTime = Date.now();

      console.log(`\n📊 Importing ${tableName}...`);
      onMessage({
        type: "progress",
        data: {
          message: `Importing ${tableName}...`,
          currentTable: tableName,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });

      if (tableName === "VaskiData") {
        let totalDocumentTypes = 0;
        let rowsImported = 0;

        targetDatabase.exec(MIGRATOR_SQL.beginTransaction);

        try {
          const summary = await migrateVaskiData(targetDatabase, {
            shouldStop: checkStop,
            documentTypeProgressRowInterval: 5000,
            onSourceRow: (row) => {
              recordSourceReference(row as Record<string, any>, {
                sourceTable: "VaskiData",
                sourcePage: normalizeNumber(row?._source?.page),
                sourcePkName: "id",
                sourcePkValue: row?.id ?? null,
                scrapedAt: null,
              });
            },
            onDocumentTypeStart: ({ documentType, index, total }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Importing ${tableName}/${documentType} (${index}/${total})...`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index - 1,
                  totalDocumentTypes: total,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeProgress: ({
              documentType,
              index,
              total,
              rowsMigrated,
            }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Importing ${tableName}/${documentType} (${index}/${total}) - ${rowsMigrated} rows`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index - 1,
                  totalDocumentTypes: total,
                  rowsInCurrentDocumentType: rowsMigrated,
                  rowsImported: rowsImported + rowsMigrated,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeComplete: ({
              documentType,
              index,
              total,
              rowsMigrated,
            }) => {
              totalDocumentTypes = total;
              rowsImported += rowsMigrated;
              onMessage({
                type: "progress",
                data: {
                  message: `Imported ${tableName}/${documentType} (${index}/${total}) - ${rowsMigrated} rows`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index,
                  totalDocumentTypes: total,
                  rowsImported,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
            onDocumentTypeSkipped: ({
              documentType,
              index,
              total,
              reason,
            }) => {
              totalDocumentTypes = total;
              onMessage({
                type: "progress",
                data: {
                  message: `Skipping ${tableName}/${documentType} (${index}/${total}) - ${reason}`,
                  currentTable: tableName,
                  currentDocumentType: documentType,
                  documentTypesCompleted: index,
                  totalDocumentTypes: total,
                  tablesCompleted,
                  totalTables: tablesToImport.length,
                },
              });
            },
          });

          rowsImported = Object.values(summary.rowsByDocumentType).reduce(
            (sum, value) => sum + value,
            0,
          );

          targetDatabase.exec(MIGRATOR_SQL.commit);

          const tableTime = ((Date.now() - tableStartTime) / 1000).toFixed(2);
          const rowsPerSecond = (
            rowsImported / Math.max(parseFloat(tableTime), 0.001)
          ).toFixed(0);
          console.log(
            `✅ Imported ${rowsImported} rows from ${tableName} in ${tableTime}s (${rowsPerSecond} rows/s)`,
          );
          console.log(
            `   Migrated document types: ${summary.migratedDocumentTypes.length}, skipped: ${summary.skippedDocumentTypes.length}, total requested: ${summary.requestedDocumentTypes.length}`,
          );

          onMessage({
            type: "progress",
            data: {
              message: `Completed ${tableName} (${summary.requestedDocumentTypes.length} processed, ${summary.migratedDocumentTypes.length} migrated, ${summary.skippedDocumentTypes.length} skipped)`,
              currentTable: tableName,
              currentDocumentType: null,
              documentTypesCompleted:
                totalDocumentTypes || summary.requestedDocumentTypes.length,
              totalDocumentTypes:
                totalDocumentTypes || summary.requestedDocumentTypes.length,
              rowsImported,
              tablesCompleted,
              totalTables: tablesToImport.length,
            },
          });
        } catch (error) {
          targetDatabase.exec(MIGRATOR_SQL.rollback);
          throw error;
        }

        tablesCompleted++;

        onMessage({
          type: "progress",
          data: {
            message: `Completed ${tableName}`,
            currentTable: tableName,
            currentDocumentType: null,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });

        continue;
      }

      // Standard table migrator
      const migratorModule = TABLE_MIGRATORS[tableName];

      if (migratorModule) {
        const migrator = migratorModule.default(targetDatabase);
        let rowsImported = 0;
        let pagesProcessed = 0;

        // Start a single transaction for the entire table
        targetDatabase.exec(MIGRATOR_SQL.beginTransaction);

        try {
          for await (const pageData of readParsedData(tableName)) {
            if (checkStop()) {
              throw new Error("Migration stopped by user");
            }

            pagesProcessed++;

            for (const row of pageData.rows) {
              const rowForMigrator = { ...row };

              // Handle XmlDataFi field specifically (used in MemberOfParliament)
              if (
                rowForMigrator.XmlDataFi &&
                typeof rowForMigrator.XmlDataFi === "object"
              ) {
                rowForMigrator.XmlDataFi = JSON.stringify(
                  rowForMigrator.XmlDataFi,
                );
              }

              recordSourceReference(rowForMigrator, {
                sourceTable: pageData.sourceTable,
                sourcePage: pageData.sourcePage,
                sourcePkName: pageData.pkName,
                sourcePkValue: pageData.pkName
                  ? rowForMigrator[pageData.pkName]
                  : null,
                scrapedAt: pageData.scrapedAt,
              });

              const result = migrator(rowForMigrator);
              if (isPromiseLike(result)) {
                await result;
              }
              rowsImported++;

              // Report progress every 5000 rows to reduce overhead
              if (rowsImported % 5000 === 0) {
                onMessage({
                  type: "progress",
                  data: {
                    message: `Importing ${tableName}... (${rowsImported} rows)`,
                    currentTable: tableName,
                    tablesCompleted,
                    totalTables: tablesToImport.length,
                    rowsImported,
                  },
                });
              }
            }

            // Log progress every 20 pages to reduce console spam
            if (pagesProcessed % 20 === 0) {
              console.log(
                `  Processed ${pagesProcessed} pages (${rowsImported} rows total)`,
              );
            }
          }

          // Flush any remaining batched rows (if migrator has flush function)
          if (migratorModule.flushVotes) {
            const result = migratorModule.flushVotes();
            if (isPromiseLike(result)) {
              await result;
            }
          }

          // Commit the transaction
          targetDatabase.exec(MIGRATOR_SQL.commit);

          const tableTime = ((Date.now() - tableStartTime) / 1000).toFixed(2);
          const rowsPerSecond = (
            rowsImported / parseFloat(tableTime)
          ).toFixed(0);
          console.log(
            `✅ Imported ${rowsImported} rows from ${tableName} in ${tableTime}s (${rowsPerSecond} rows/s)`,
          );
        } catch (error) {
          targetDatabase.exec(MIGRATOR_SQL.rollback);
          throw error;
        }
      } else {
        console.warn(`⚠️  No migrator found for ${tableName}, skipping...`);
      }

      tablesCompleted++;

      onMessage({
        type: "progress",
        data: {
          message: `Completed ${tableName}`,
          currentTable: tableName,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
    }

    if (sourceReferenceStatement) {
      sourceReferenceStatement.finalize();
      sourceReferenceStatement = null;
    }

    if (sourceReferenceMode !== "off") {
      console.log("🧾 Persisting import source summaries...");
      if (!traceDatabase) {
        throw new Error(
          "Trace database was not initialized while source reference mode is enabled",
        );
      }
      persistImportSourceReferenceSummaries(
        traceDatabase,
        sourceReferenceSummaries,
      );
      console.log(
        `✅ Import source summaries persisted (${sourceReferenceSummaries.size} tables)`,
      );
    }

    onMessage({
      type: "progress",
      data: {
        message: "Normalizing imported text values...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("\n🧹 Normalizing imported text values...");
    normalizeImportedTextData(targetDatabase);
    console.log("✅ Text normalization complete");

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding voting-party aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding voting-party aggregate table...");
    const votingPartyStatsRows = rebuildVotingPartyStats(targetDatabase);
    console.log(
      `✅ Voting-party aggregate table rebuilt (${votingPartyStatsRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding person-voting aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding person-voting aggregate table...");
    const personVotingRows = rebuildPersonVotingDailyStats(targetDatabase);
    console.log(
      `✅ Person-voting aggregate table rebuilt (${personVotingRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding person-speech aggregates...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🧮 Rebuilding person-speech aggregate table...");
    const personSpeechRows = rebuildPersonSpeechDailyStats(targetDatabase);
    console.log(
      `✅ Person-speech aggregate table rebuilt (${personSpeechRows} rows)`,
    );

    onMessage({
      type: "progress",
      data: {
        message: "Rebuilding federated search index...",
        currentTable: null,
        tablesCompleted,
        totalTables: tablesToImport.length,
      },
    });
    console.log("🔎 Rebuilding federated search index...");
    const federatedSearchRows = rebuildFederatedSearchIndex(
      targetDatabase,
      federatedSearchBodyMaxChars,
    );
    console.log(
      `✅ Federated search index rebuilt (${federatedSearchRows} rows)`,
    );

    // Update database timestamp
    const timestamp = new Date().toISOString();
    targetDatabase.run(MIGRATOR_SQL.createMigrationInfoTable);
    targetDatabase.run(MIGRATOR_SQL.upsertMigrationTimestamp, [timestamp]);

    if (doRunForeignKeyCheck) {
      try {
        const foreignKeyCheck = runForeignKeyCheck(
          targetDatabase,
          foreignKeyCheckSampleLimit,
        );
        const foreignKeyCheckPath = path.join(
          reportDirs.reports,
          "foreign_key_check.json",
        );
        fs.mkdirSync(reportDirs.reports, { recursive: true });
        fs.writeFileSync(
          foreignKeyCheckPath,
          JSON.stringify(
            {
              reason: "foreign_key_check",
              details:
                foreignKeyCheck.totalViolations > 0
                  ? `Found ${foreignKeyCheck.totalViolations} foreign key violation(s)`
                  : "No foreign key violations found",
              issue_count: foreignKeyCheck.totalViolations,
              ...foreignKeyCheck,
            },
            null,
            2,
          ),
          "utf8",
        );

        if (foreignKeyCheck.totalViolations > 0) {
          console.warn(
            `⚠️  Foreign key check found ${foreignKeyCheck.totalViolations} violation(s); see ${foreignKeyCheckPath}`,
          );
        } else {
          console.log("✅ Foreign key check found no violations");
        }
      } catch (foreignKeyCheckError) {
        console.warn(
          `⚠️  Foreign key check failed (non-blocking): ${String(foreignKeyCheckError)}`,
        );
      }
    }

    // Re-enable safety features
    console.log("\n⚙️  Re-enabling safety features...");
    if (useExclusiveLock) {
      targetDatabase.exec(SQLITE_PRAGMAS.lockingModeNormal);
    }
    targetDatabase.exec(SQLITE_PRAGMAS.synchronousFull);
    console.log("💾 Flushing WAL checkpoint...");
    targetDatabase.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    if (shouldVacuumAfterImport) {
      onMessage({
        type: "progress",
        data: {
          message: "Compacting database file (VACUUM)...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      const databasePath = getDatabasePath();
      const sizeBeforeBytes = fs.existsSync(databasePath)
        ? fs.statSync(databasePath).size
        : 0;
      console.log("🗜️  Running VACUUM to compact database file...");
      targetDatabase.exec("VACUUM;");
      const sizeAfterBytes = fs.existsSync(databasePath)
        ? fs.statSync(databasePath).size
        : 0;
      const toMb = (bytes: number) => (bytes / (1024 * 1024)).toFixed(1);
      console.log(
        `✅ VACUUM complete (${toMb(sizeBeforeBytes)} MB -> ${toMb(sizeAfterBytes)} MB)`,
      );
    } else {
      console.log(
        "⏭️  Skipping VACUUM (MIGRATOR_VACUUM_AFTER_IMPORT disabled)",
      );
    }

    if (traceDatabase && traceTransactionOpen) {
      traceDatabase.exec(MIGRATOR_SQL.commit);
      traceTransactionOpen = false;
      traceDatabase.exec(SQLITE_PRAGMAS.synchronousFull);
      traceDatabase.exec("PRAGMA wal_checkpoint(TRUNCATE);");
    }

    console.log("✅ Safety features restored");

    targetDatabase.close();
    if (sourceReferenceStatement) {
      sourceReferenceStatement.finalize();
      sourceReferenceStatement = null;
    }
    if (traceDatabase) {
      traceDatabase.close();
      traceDatabase = null;
    }
    await publishLatestDatabaseArtifact({
      runId: reportRunId,
      migratedAt: timestamp,
    });

    const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n🎉 Migration completed successfully in ${totalTime}s!`);
    console.log(`   Tables imported: ${tablesToImport.length}`);
    console.log(`   Timestamp: ${timestamp}`);

    migrationStatus = "success";

    onMessage({
      type: "complete",
      data: {
        message: `Migration completed successfully in ${totalTime}s`,
        tablesImported: tablesToImport.length,
        timestamp,
        totalTime,
      },
    });
  } catch (error: any) {
    if (sourceReferenceStatement) {
      sourceReferenceStatement.finalize();
      sourceReferenceStatement = null;
    }
    if (traceDatabase && traceTransactionOpen) {
      try {
        traceDatabase.exec(MIGRATOR_SQL.rollback);
      } catch (_rollbackError) {
        // best effort rollback
      }
      traceTransactionOpen = false;
    }
    if (traceDatabase) {
      try {
        traceDatabase.close();
      } catch (_closeError) {
        // ignore close error
      }
      traceDatabase = null;
    }

    migrationStatus = checkStop() ? "stopped" : "failed";
    migrationError = error?.message || String(error);
    if (checkStop()) {
      onMessage({
        type: "stopped",
        data: { message: "Migration stopped by user" },
      });
    } else {
      onMessage({
        type: "error",
        data: { error: error?.message ?? String(error) },
      });
    }
    throw error;
  } finally {
    const reportFinishedAt = new Date().toISOString();
    try {
      consolidatedReport = buildConsolidatedMigrationReport({
        runId: reportRunId,
        status: migrationStatus,
        startedAt: reportStartedAt,
        finishedAt: reportFinishedAt,
        error: migrationError,
        reportDir: reportDirs.reports,
        overwriteDir: reportDirs.overwrites,
        knownIssueDir: reportDirs.knownIssues,
        rootDir: reportRootDir,
      });
      const consolidatedReportPath = path.join(
        reportRootDir,
        "consolidated-report.json",
      );
      writeConsolidatedMigrationReport(
        consolidatedReport,
        consolidatedReportPath,
      );
      console.log(
        `📄 Consolidated migration report: ${consolidatedReportPath}`,
      );

      await publishMigrationRunReports({
        runId: reportRunId,
        localRootDir: reportRootDir,
        status: migrationStatus,
        startedAt: reportStartedAt,
        finishedAt: reportFinishedAt,
        consolidatedReport,
        migrationError,
      });
    } catch (reportError) {
      console.warn(
        `⚠️  Failed to publish migration reports: ${String(reportError)}`,
      );
    }

    fs.rmSync(reportRootDir, { recursive: true, force: true });

    if (previousReportEnv.report === undefined) {
      delete process.env.MIGRATOR_REPORT_LOG_DIR;
    } else {
      process.env.MIGRATOR_REPORT_LOG_DIR = previousReportEnv.report;
    }

    if (previousReportEnv.overwrite === undefined) {
      delete process.env.MIGRATOR_OVERWRITE_LOG_DIR;
    } else {
      process.env.MIGRATOR_OVERWRITE_LOG_DIR = previousReportEnv.overwrite;
    }

    if (previousReportEnv.knownIssue === undefined) {
      delete process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR;
    } else {
      process.env.MIGRATOR_KNOWN_ISSUE_LOG_DIR = previousReportEnv.knownIssue;
    }
  }
}

/**
 * Get last migration timestamp from database.
 */
export function getLastMigrationTimestamp(): string | null {
  try {
    const db = sqlite.open(getDatabasePath(), { readonly: true });
    const result = db
      .query<{ value: string }, []>(
        `SELECT value FROM _migration_info WHERE key = 'last_migration'`,
      )
      .get();
    db.close();
    return result?.value || null;
  } catch (_error) {
    return null;
  }
}

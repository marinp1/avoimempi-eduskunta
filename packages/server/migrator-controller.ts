import sqlite, { type Database } from "bun:sqlite";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { ServerWebSocket } from "bun";
import { getMigrations } from "bun-sqlite-migrations";
import { TableName } from "#constants/index";
import {
  buildConsolidatedMigrationReport,
  type ConsolidatedMigrationReport,
  type ConsolidatedMigrationStatus,
  writeConsolidatedMigrationReport,
} from "../datapipe/migrator/reporting";
import { clearStatementCache } from "../datapipe/migrator/utils";
import { migrateVaskiData } from "../datapipe/migrator/VaskiData/migrator";
import { getDatabasePath } from "../shared/database";
import {
  getStorage,
  listAllStorageKeys,
  StorageKeyBuilder,
} from "../shared/storage";
import {
  getDeleteAllRowsQuery,
  MIGRATOR_SQL,
  SQLITE_PRAGMAS,
} from "./database/sql-statements";

type SqlMigration = {
  version: number;
  up: string[];
  down: string;
};

export interface MigratorStatus {
  isRunning: boolean;
  currentTable: string | null;
  progress: number;
  totalTables: number;
}

export interface MigratorMessage {
  type: "status" | "progress" | "complete" | "error" | "stopped";
  data?: any;
}

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

const objectExists = (
  db: Database,
  type: "table" | "index" | "trigger",
  name: string,
): boolean => {
  const row = db
    .query(
      "SELECT 1 AS exists_flag FROM sqlite_master WHERE type = $type AND name = $name LIMIT 1",
    )
    .get({
      $type: type,
      $name: name,
    }) as { exists_flag?: number } | undefined;
  return !!row?.exists_flag;
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

const MIGRATION_RUN_REPORTS_STORAGE_PREFIX = "metadata/migration-runs";
const MIGRATION_RUN_LATEST_STORAGE_KEY = `${MIGRATION_RUN_REPORTS_STORAGE_PREFIX}/latest.json`;
const MIGRATION_RUN_LATEST_SUCCESS_STORAGE_KEY = `${MIGRATION_RUN_REPORTS_STORAGE_PREFIX}/latest-success.json`;
const SQLITE_ARTIFACTS_STORAGE_PREFIX = "artifacts/sqlite";
const SQLITE_LATEST_MANIFEST_STORAGE_KEY = `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/latest/manifest.json`;

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

const IMPORT_METADATA_FIELDS = {
  sourceTable: "__sourceTable",
  sourcePage: "__sourcePage",
  scrapedAt: "__sourceScrapedAt",
  sourcePrimaryKeyName: "__sourcePrimaryKeyName",
  sourcePrimaryKeyValue: "__sourcePrimaryKeyValue",
} as const;

type ParsedPageEnvelope = {
  rowData?: any[];
  pkName?: string;
  source?: {
    tableName?: string;
    firstPk?: number;
    lastPk?: number;
    scrapedAt?: string | null;
  };
};

type ParsedPageBatch = {
  firstPk: number;
  rows: any[];
  pkName: string | null;
  sourceTable: string;
  sourcePage: number | null;
  scrapedAt: string | null;
};

type SourceReferenceFallback = {
  sourceTable: string;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: unknown;
  scrapedAt: string | null;
};

type SourceReference = {
  sourceTable: string;
  sourcePage: number | null;
  sourcePkName: string | null;
  sourcePkValue: string | null;
  scrapedAt: string | null;
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
  const sourceTable =
    normalizeText(row[IMPORT_METADATA_FIELDS.sourceTable]) ??
    fallback.sourceTable;
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

/**
 * Controller for managing database migration from parsed storage
 */
export class MigratorController {
  private static instance: MigratorController | null = null;
  private isRunning = false;
  private shouldStop = false;
  private currentTable: string | null = null;
  private ws: ServerWebSocket<unknown> | null = null;

  private constructor() {}

  static getInstance(): MigratorController {
    if (!MigratorController.instance) {
      MigratorController.instance = new MigratorController();
    }
    return MigratorController.instance;
  }

  setWebSocket(ws: ServerWebSocket<unknown>) {
    this.ws = ws;
  }

  getStatus(): MigratorStatus {
    return {
      isRunning: this.isRunning,
      currentTable: this.currentTable,
      progress: 0,
      totalTables: 0,
    };
  }

  private sendMessage(message: MigratorMessage) {
    if (this.ws && this.ws.readyState === 1) {
      this.ws.send(JSON.stringify(message));
    }
  }

  /**
   * Get ordered list of tables to import
   */
  private getOrderedTables(): string[] {
    const allTables = Object.values(TableName) as string[];
    return allTables.sort(
      (a, b) =>
        (IMPORT_ORDER[a] ?? Number.MAX_SAFE_INTEGER) -
        (IMPORT_ORDER[b] ?? Number.MAX_SAFE_INTEGER),
    );
  }

  /**
   * Check which tables have parsed data available
   */
  private async getTablesWithParsedData(): Promise<string[]> {
    const storage = getStorage();
    const allTables = this.getOrderedTables().filter(
      (tableName) => !DISABLED_IMPORT_TABLES.has(tableName),
    );
    const tablesWithData: string[] = [];

    for (const tableName of allTables) {
      const prefix = StorageKeyBuilder.listPrefixForTable("parsed", tableName);
      const result = await storage.list({ prefix, maxKeys: 1 });
      if (result.keys.length > 0) {
        tablesWithData.push(tableName);
      }
    }

    return tablesWithData;
  }

  /**
   * Read all parsed pages for a table
   */
  private async *readParsedData(
    tableName: string,
  ): AsyncGenerator<ParsedPageBatch> {
    const storage = getStorage();
    const prefix = StorageKeyBuilder.listPrefixForTable("parsed", tableName);
    const keys = await listAllStorageKeys(storage, {
      prefix,
      pageSize: 10_000,
    });

    // Sort pages by firstPk ascending
    const sortedPages = keys
      .map((k) => ({ key: k, parsed: StorageKeyBuilder.parseKey(k.key) }))
      .filter((p) => p.parsed !== null)
      .sort((a, b) => (a.parsed?.firstPk || 0) - (b.parsed?.firstPk || 0));

    for (const pageInfo of sortedPages) {
      if (!pageInfo.parsed) {
        continue;
      }

      const data = await storage.get(pageInfo.key.key);
      if (data) {
        const pageData = JSON.parse(data) as ParsedPageEnvelope;
        const rows = Array.isArray(pageData.rowData) ? pageData.rowData : [];

        yield {
          firstPk: pageInfo.parsed.firstPk,
          rows,
          pkName: normalizeText(pageData.pkName),
          sourceTable: normalizeText(pageData.source?.tableName) ?? tableName,
          sourcePage:
            normalizeNumber(pageData.source?.firstPk) ??
            pageInfo.parsed.firstPk,
          scrapedAt: normalizeText(pageData.source?.scrapedAt),
        };
      }
    }
  }

  private async publishMigrationRunReports(params: {
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

  private async publishLatestDatabaseArtifact(params: {
    runId: string;
    migratedAt: string;
  }): Promise<void> {
    const storage = getStorage();
    const databasePath = getDatabasePath();
    const databaseFileName = path.basename(databasePath);
    const artifactKey = `${SQLITE_ARTIFACTS_STORAGE_PREFIX}/latest/${databaseFileName}`;
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
    if (snapshotKey) {
      await storage.putFile(snapshotKey, databasePath);
    }

    const stats = fs.statSync(databasePath);
    const manifest = {
      runId: params.runId,
      migratedAt: params.migratedAt,
      storageProvider: storage.name,
      dbArtifactKey: artifactKey,
      snapshotKey,
      dbFileName: databaseFileName,
      dbSizeBytes: stats.size,
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

  private runForeignKeyCheck(
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

  private normalizeImportedTextData(db: Database): void {
    const normalizeTransaction = db.transaction(() => {
      if (objectExists(db, "table", "Interpellation")) {
        db.run(
          `UPDATE Interpellation
           SET
             title = NULLIF(TRIM(title), ''),
             question_text = NULLIF(TRIM(question_text), ''),
             resolution_text = NULLIF(TRIM(resolution_text), '')`,
        );
      }

      if (objectExists(db, "table", "GovernmentProposal")) {
        db.run(
          `UPDATE GovernmentProposal
           SET
             title = NULLIF(TRIM(title), ''),
             author = NULLIF(TRIM(author), ''),
             summary_text = NULLIF(TRIM(summary_text), ''),
             justification_text = NULLIF(TRIM(justification_text), ''),
             proposal_text = NULLIF(TRIM(proposal_text), ''),
             appendix_text = NULLIF(TRIM(appendix_text), '')`,
        );
      }

      if (objectExists(db, "table", "WrittenQuestion")) {
        db.run(
          `UPDATE WrittenQuestion
           SET
             title = NULLIF(TRIM(title), ''),
             question_text = NULLIF(TRIM(question_text), ''),
             answer_minister_title = NULLIF(TRIM(answer_minister_title), ''),
             answer_minister_first_name = NULLIF(TRIM(answer_minister_first_name), ''),
             answer_minister_last_name = NULLIF(TRIM(answer_minister_last_name), '')`,
        );
      }

      if (objectExists(db, "table", "WrittenQuestionResponse")) {
        db.run(
          `UPDATE WrittenQuestionResponse
           SET
             title = NULLIF(TRIM(title), ''),
             minister_title = NULLIF(TRIM(minister_title), ''),
             minister_first_name = NULLIF(TRIM(minister_first_name), ''),
             minister_last_name = NULLIF(TRIM(minister_last_name), '')`,
        );
      }

      if (objectExists(db, "table", "OralQuestion")) {
        db.run(
          `UPDATE OralQuestion
           SET
             title = NULLIF(TRIM(title), ''),
             question_text = NULLIF(TRIM(question_text), ''),
             asker_text = NULLIF(TRIM(asker_text), '')`,
        );
      }

      if (objectExists(db, "table", "LegislativeInitiative")) {
        db.run(
          `UPDATE LegislativeInitiative
           SET
             title = NULLIF(TRIM(title), ''),
             justification_text = NULLIF(TRIM(justification_text), ''),
             proposal_text = NULLIF(TRIM(proposal_text), ''),
             law_text = NULLIF(TRIM(law_text), '')`,
        );
      }

      if (objectExists(db, "table", "CommitteeReport")) {
        db.run(
          `UPDATE CommitteeReport
           SET
             title = NULLIF(TRIM(title), ''),
             committee_name = NULLIF(TRIM(committee_name), ''),
             recipient_committee = NULLIF(TRIM(recipient_committee), ''),
             source_reference = NULLIF(TRIM(source_reference), '')`,
        );
      }

      if (objectExists(db, "table", "SectionDocumentLink")) {
        db.run(
          `UPDATE SectionDocumentLink
           SET
             link_text_fi = NULLIF(TRIM(link_text_fi), ''),
             name_fi = NULLIF(TRIM(name_fi), ''),
             key = NULLIF(TRIM(key), ''),
             link_url_fi = NULLIF(TRIM(link_url_fi), '')`,
        );
      }

      if (objectExists(db, "table", "SaliDBDocumentReference")) {
        db.run(
          `UPDATE SaliDBDocumentReference
           SET
             source_text = NULLIF(TRIM(source_text), ''),
             source_url = NULLIF(TRIM(source_url), ''),
             source_type = NULLIF(TRIM(source_type), ''),
             document_tunnus = NULLIF(TRIM(document_tunnus), '')`,
        );
      }

      if (objectExists(db, "table", "Vote")) {
        db.run(
          `UPDATE Vote
           SET group_abbreviation = LOWER(NULLIF(TRIM(group_abbreviation), ''))`,
        );
      }

      if (objectExists(db, "table", "Representative")) {
        db.run(
          `UPDATE Representative
           SET
             first_name = NULLIF(TRIM(first_name), ''),
             last_name = NULLIF(TRIM(last_name), ''),
             sort_name = NULLIF(TRIM(sort_name), ''),
             party = LOWER(NULLIF(TRIM(party), ''))`,
        );
      }
    });

    normalizeTransaction.immediate();
  }

  private rebuildVotingPartyStats(db: Database): number {
    if (!objectExists(db, "table", "VotingPartyStats")) {
      return 0;
    }

    const rebuildTransaction = db.transaction(() => {
      db.run("DELETE FROM VotingPartyStats");
      db.run(
        `INSERT INTO VotingPartyStats (
           voting_id,
           party,
           votes_cast,
           total_votings,
           party_member_count,
           n_jaa,
           n_ei,
           n_tyhjaa,
           n_poissa
         )
         SELECT
           v.voting_id,
           v.group_abbreviation AS party,
           SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
           COUNT(*) AS total_votings,
           COUNT(DISTINCT v.person_id) AS party_member_count,
           SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) AS n_jaa,
           SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) AS n_ei,
           SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END) AS n_tyhjaa,
           SUM(CASE WHEN v.vote = 'Poissa' THEN 1 ELSE 0 END) AS n_poissa
         FROM Vote v INDEXED BY idx_vote_voting_group_person_vote
         WHERE v.group_abbreviation IS NOT NULL
           AND TRIM(v.group_abbreviation) != ''
         GROUP BY v.voting_id, v.group_abbreviation`,
      );
    });

    rebuildTransaction.immediate();

    const row = db
      .query<{ count: number }, []>(
        "SELECT COUNT(*) AS count FROM VotingPartyStats",
      )
      .get();
    return row?.count ?? 0;
  }

  private rebuildPersonVotingDailyStats(db: Database): number {
    if (!objectExists(db, "table", "PersonVotingDailyStats")) {
      return 0;
    }

    const rebuildTransaction = db.transaction(() => {
      db.run("DELETE FROM PersonVotingDailyStats");
      db.run(
        `INSERT INTO PersonVotingDailyStats (
           person_id,
           voting_date,
           votes_cast,
           total_votings
         )
         SELECT
           v.person_id,
           vt.start_date AS voting_date,
           SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
           COUNT(*) AS total_votings
         FROM Vote v INDEXED BY idx_vote_person_voting
         JOIN Voting vt ON vt.id = v.voting_id
         WHERE v.person_id IS NOT NULL
           AND vt.start_date IS NOT NULL
         GROUP BY v.person_id, vt.start_date`,
      );
    });

    rebuildTransaction.immediate();

    const row = db
      .query<{ count: number }, []>(
        "SELECT COUNT(*) AS count FROM PersonVotingDailyStats",
      )
      .get();
    return row?.count ?? 0;
  }

  private rebuildPersonSpeechDailyStats(db: Database): number {
    if (!objectExists(db, "table", "PersonSpeechDailyStats")) {
      return 0;
    }

    const rebuildTransaction = db.transaction(() => {
      db.run("DELETE FROM PersonSpeechDailyStats");
      db.run(
        `INSERT INTO PersonSpeechDailyStats (
           person_id,
           speech_date,
           speech_count,
           total_words,
           first_speech,
           last_speech
         )
         SELECT
           sp.person_id,
           SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10) AS speech_date,
           COUNT(*) AS speech_count,
           SUM(
             CASE
               WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
               ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
             END
           ) AS total_words,
           MIN(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS first_speech,
           MAX(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS last_speech
         FROM Speech sp
         LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
         LEFT JOIN Session sess ON sess.key = sp.session_key
         WHERE COALESCE(sp.has_spoken, 1) = 1
           AND sp.person_id IS NOT NULL
           AND COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date) IS NOT NULL
         GROUP BY sp.person_id, SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10)`,
      );
    });

    rebuildTransaction.immediate();

    const row = db
      .query<{ count: number }, []>(
        "SELECT COUNT(*) AS count FROM PersonSpeechDailyStats",
      )
      .get();
    return row?.count ?? 0;
  }

  private rebuildFederatedSearchIndex(db: Database): number {
    if (!objectExists(db, "table", "FederatedSearchFts")) {
      return 0;
    }

    const rebuildTransaction = db.transaction(() => {
      db.run("DELETE FROM FederatedSearchFts");

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'mp',
           CAST(r.person_id AS TEXT),
           COALESCE(
             NULLIF(TRIM(COALESCE(r.first_name, '') || ' ' || COALESCE(r.last_name, '')), ''),
             NULLIF(TRIM(r.sort_name), ''),
             CAST(r.person_id AS TEXT)
           ),
           NULLIF(TRIM(r.party), ''),
           TRIM(
             COALESCE(r.first_name, '') || ' ' ||
             COALESCE(r.last_name, '') || ' ' ||
             COALESCE(r.party, '') || ' ' ||
             COALESCE(r.profession, '')
           ),
           NULL
         FROM Representative r
         WHERE EXISTS (
           SELECT 1
           FROM Term t
           WHERE t.person_id = r.person_id
             AND t.end_date IS NULL
         )`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'voting',
           CAST(v.id AS TEXT),
           COALESCE(
             NULLIF(TRIM(v.section_title), ''),
             NULLIF(TRIM(v.title), ''),
             'Voting ' || CAST(v.id AS TEXT)
           ),
           'Jaa: ' || COALESCE(v.n_yes, 0) || ' / Ei: ' || COALESCE(v.n_no, 0),
           TRIM(
             COALESCE(v.title, '') || ' ' ||
             COALESCE(v.section_title, '') || ' ' ||
             COALESCE(v.main_section_title, '') || ' ' ||
             COALESCE(v.agenda_title, '') || ' ' ||
             COALESCE(v.section_processing_title, '') || ' ' ||
             COALESCE(v.session_key, '')
           ),
           v.start_time
         FROM Voting v`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'interpellation',
           CAST(i.id AS TEXT),
           COALESCE(NULLIF(TRIM(i.title), ''), i.parliament_identifier),
           i.parliament_identifier,
           TRIM(
             COALESCE(i.title, '') || ' ' ||
             COALESCE(i.parliament_identifier, '') || ' ' ||
             COALESCE(i.question_text, '') || ' ' ||
             COALESCE(i.resolution_text, '')
           ),
           i.submission_date
         FROM Interpellation i`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'government-proposal',
           CAST(g.id AS TEXT),
           COALESCE(NULLIF(TRIM(g.title), ''), g.parliament_identifier),
           g.parliament_identifier,
           TRIM(
             COALESCE(g.title, '') || ' ' ||
             COALESCE(g.parliament_identifier, '') || ' ' ||
             COALESCE(g.summary_text, '') || ' ' ||
             COALESCE(g.justification_text, '')
           ),
           g.submission_date
         FROM GovernmentProposal g`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'written-question',
           CAST(wq.id AS TEXT),
           COALESCE(NULLIF(TRIM(wq.title), ''), wq.parliament_identifier),
           wq.parliament_identifier,
           TRIM(
             COALESCE(wq.title, '') || ' ' ||
             COALESCE(wq.parliament_identifier, '') || ' ' ||
             COALESCE(wq.question_text, '')
           ),
           wq.submission_date
         FROM WrittenQuestion wq`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'oral-question',
           CAST(oq.id AS TEXT),
           COALESCE(NULLIF(TRIM(oq.title), ''), oq.parliament_identifier),
           oq.parliament_identifier,
           TRIM(
             COALESCE(oq.title, '') || ' ' ||
             COALESCE(oq.parliament_identifier, '') || ' ' ||
             COALESCE(oq.question_text, '') || ' ' ||
             COALESCE(oq.asker_text, '')
           ),
           oq.submission_date
         FROM OralQuestion oq`,
      );

      db.run(
        `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
         SELECT
           'legislative-initiative',
           CAST(li.id AS TEXT),
           COALESCE(NULLIF(TRIM(li.title), ''), li.parliament_identifier),
           li.parliament_identifier,
           TRIM(
             COALESCE(li.title, '') || ' ' ||
             COALESCE(li.parliament_identifier, '') || ' ' ||
             COALESCE(li.justification_text, '') || ' ' ||
             COALESCE(li.proposal_text, '')
           ),
           li.submission_date
         FROM LegislativeInitiative li`,
      );
    });

    rebuildTransaction.immediate();

    const row = db
      .query<{ count: number }, []>(
        "SELECT COUNT(*) AS count FROM FederatedSearchFts",
      )
      .get();
    return row?.count ?? 0;
  }

  /**
   * Start database migration from parsed storage
   */
  async startMigration() {
    if (this.isRunning) {
      throw new Error("Migration is already running");
    }

    this.isRunning = true;
    this.shouldStop = false;

    this.sendMessage({
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
    const useExclusiveLock = isTruthyEnv(process.env.MIGRATOR_EXCLUSIVE_LOCK);
    const runForeignKeyCheck = isTruthyEnv(
      process.env.MIGRATOR_FOREIGN_KEY_CHECK,
    );
    const foreignKeyCheckSampleLimit = parsePositiveInt(
      process.env.MIGRATOR_FOREIGN_KEY_CHECK_SAMPLE_LIMIT,
      1000,
    );

    try {
      // Get tables with parsed data
      const tablesToImport = await this.getTablesWithParsedData();

      if (tablesToImport.length === 0) {
        throw new Error("No parsed data found to migrate");
      }

      this.sendMessage({
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
      targetDatabase.exec(SQLITE_PRAGMAS.synchronousOff); // Disable sync for speed (data can be regenerated)
      targetDatabase.exec(SQLITE_PRAGMAS.cacheSize64Mb); // 64MB cache
      targetDatabase.exec(SQLITE_PRAGMAS.tempStoreMemory); // Keep temp data in memory
      targetDatabase.exec(SQLITE_PRAGMAS.mmapSize30Gb); // Use memory-mapped I/O
      targetDatabase.exec(SQLITE_PRAGMAS.foreignKeysOff);
      if (useExclusiveLock) {
        targetDatabase.exec(SQLITE_PRAGMAS.lockingModeExclusive);
      }

      // Run migrations
      const migrationsPath = path.resolve(
        import.meta.dirname,
        "../datapipe/migrator/migrations",
      );
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
      const sourceReferenceStatement = targetDatabase.prepare(
        `INSERT INTO ImportSourceReference (
           source_table,
           source_page,
           source_pk_name,
           source_pk_value,
           scraped_at,
           migrated_at
         ) VALUES (?, ?, ?, ?, ?, ?)`,
      );
      const recordSourceReference = (
        row: Record<string, any>,
        fallback: SourceReferenceFallback,
      ) => {
        const sourceReference = normalizeSourceReference(row, fallback);
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
        if (this.shouldStop) {
          throw new Error("Migration stopped by user");
        }

        this.currentTable = tableName;
        const tableStartTime = Date.now();

        console.log(`\n📊 Importing ${tableName}...`);
        this.sendMessage({
          type: "progress",
          data: {
            message: `Importing ${tableName}...`,
            currentTable: tableName,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });

        if (tableName === TableName.VaskiData) {
          let totalDocumentTypes = 0;
          let rowsImported = 0;

          targetDatabase.exec(MIGRATOR_SQL.beginTransaction);

          try {
            const summary = await migrateVaskiData(targetDatabase, {
              shouldStop: () => this.shouldStop,
              documentTypeProgressRowInterval: 5000,
              onSourceRow: (row) => {
                recordSourceReference(row as Record<string, any>, {
                  sourceTable: TableName.VaskiData,
                  sourcePage: normalizeNumber(row?._source?.page),
                  sourcePkName: "id",
                  sourcePkValue: row?.id ?? null,
                  scrapedAt: null,
                });
              },
              onDocumentTypeStart: ({ documentType, index, total }) => {
                totalDocumentTypes = total;
                this.sendMessage({
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
                this.sendMessage({
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
                this.sendMessage({
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
                this.sendMessage({
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

            this.sendMessage({
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

          this.sendMessage({
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

        // Check if migrator exists
        const migratorPath = path.resolve(
          import.meta.dirname,
          `../datapipe/migrator/${tableName}/migrator.ts`,
        );

        if (fs.existsSync(migratorPath)) {
          // Dynamic import the migrator
          const migratorModule = (await import(migratorPath)) as {
            default: (sql: Database) => (data: any) => void | Promise<void>;
            flushVotes?: () => void | Promise<void>;
          };

          const migrator = migratorModule.default(targetDatabase);
          let rowsImported = 0;
          let pagesProcessed = 0;

          // Start a single transaction for the entire table
          targetDatabase.exec(MIGRATOR_SQL.beginTransaction);

          try {
            // Read and import data
            for await (const pageData of this.readParsedData(tableName)) {
              if (this.shouldStop) {
                throw new Error("Migration stopped by user");
              }

              pagesProcessed++;

              for (const row of pageData.rows) {
                // Convert parsed object fields back to JSON strings for the migrator
                // The old migrator expects fields like XmlDataFi to be JSON strings
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
                  this.sendMessage({
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
            // Rollback on error
            targetDatabase.exec(MIGRATOR_SQL.rollback);
            throw error;
          }
        } else {
          console.warn(`⚠️  No migrator found for ${tableName}, skipping...`);
        }

        tablesCompleted++;

        this.sendMessage({
          type: "progress",
          data: {
            message: `Completed ${tableName}`,
            currentTable: tableName,
            tablesCompleted,
            totalTables: tablesToImport.length,
          },
        });
      }

      this.sendMessage({
        type: "progress",
        data: {
          message: "Normalizing imported text values...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      console.log("\n🧹 Normalizing imported text values...");
      this.normalizeImportedTextData(targetDatabase);
      console.log("✅ Text normalization complete");

      this.sendMessage({
        type: "progress",
        data: {
          message: "Rebuilding voting-party aggregates...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      console.log("🧮 Rebuilding voting-party aggregate table...");
      const votingPartyStatsRows = this.rebuildVotingPartyStats(targetDatabase);
      console.log(
        `✅ Voting-party aggregate table rebuilt (${votingPartyStatsRows} rows)`,
      );

      this.sendMessage({
        type: "progress",
        data: {
          message: "Rebuilding person-voting aggregates...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      console.log("🧮 Rebuilding person-voting aggregate table...");
      const personVotingRows = this.rebuildPersonVotingDailyStats(targetDatabase);
      console.log(
        `✅ Person-voting aggregate table rebuilt (${personVotingRows} rows)`,
      );

      this.sendMessage({
        type: "progress",
        data: {
          message: "Rebuilding person-speech aggregates...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      console.log("🧮 Rebuilding person-speech aggregate table...");
      const personSpeechRows = this.rebuildPersonSpeechDailyStats(targetDatabase);
      console.log(
        `✅ Person-speech aggregate table rebuilt (${personSpeechRows} rows)`,
      );

      this.sendMessage({
        type: "progress",
        data: {
          message: "Rebuilding federated search index...",
          currentTable: null,
          tablesCompleted,
          totalTables: tablesToImport.length,
        },
      });
      console.log("🔎 Rebuilding federated search index...");
      const federatedSearchRows = this.rebuildFederatedSearchIndex(targetDatabase);
      console.log(
        `✅ Federated search index rebuilt (${federatedSearchRows} rows)`,
      );

      // Update database timestamp
      const timestamp = new Date().toISOString();
      targetDatabase.run(MIGRATOR_SQL.createMigrationInfoTable);
      targetDatabase.run(MIGRATOR_SQL.upsertMigrationTimestamp, [timestamp]);

      if (runForeignKeyCheck) {
        try {
          const foreignKeyCheck = this.runForeignKeyCheck(
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
      console.log("✅ Safety features restored");

      targetDatabase.close();
      await this.publishLatestDatabaseArtifact({
        runId: reportRunId,
        migratedAt: timestamp,
      });

      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      console.log(`\n🎉 Migration completed successfully in ${totalTime}s!`);
      console.log(`   Tables imported: ${tablesToImport.length}`);
      console.log(`   Timestamp: ${timestamp}`);

      migrationStatus = "success";

      this.sendMessage({
        type: "complete",
        data: {
          message: `Migration completed successfully in ${totalTime}s`,
          tablesImported: tablesToImport.length,
          timestamp,
          totalTime,
        },
      });
    } catch (error: any) {
      migrationStatus = this.shouldStop ? "stopped" : "failed";
      migrationError = error?.message || String(error);
      if (this.shouldStop) {
        this.sendMessage({
          type: "stopped",
          data: {
            message: "Migration stopped by user",
          },
        });
      } else {
        this.sendMessage({
          type: "error",
          data: {
            error: error.message,
          },
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

        await this.publishMigrationRunReports({
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

      this.isRunning = false;
      this.currentTable = null;
      this.shouldStop = false;
    }
  }

  stopMigration() {
    if (!this.isRunning) {
      throw new Error("No migration is currently running");
    }

    this.shouldStop = true;
    this.sendMessage({
      type: "status",
      data: {
        status: "stopping",
        message: "Stopping migration...",
      },
    });
  }

  /**
   * Get last migration timestamp from database
   */
  static getLastMigrationTimestamp(): string | null {
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
}

import { Database } from "bun:sqlite";
import path from "node:path";
import { getDatabasePath } from "#database";

export function getAnalysisDatabasePath(): string {
  if (process.env.ANALYSIS_DB_PATH) return process.env.ANALYSIS_DB_PATH;
  const mainDbPath = getDatabasePath();
  return path.join(path.dirname(mainDbPath), "avoimempi-eduskunta-analysis.db");
}

export function initAnalysisDb(dbPath: string): Database {
  const db = new Database(dbPath, { create: true, readwrite: true });

  db.run(`PRAGMA journal_mode = WAL;`);
  db.run(`PRAGMA synchronous = NORMAL;`);

  db.run(`
    CREATE TABLE IF NOT EXISTS ExpertStatementAnalysis (
      edk_identifier    TEXT PRIMARY KEY,
      summary           TEXT NOT NULL,
      stance_value      TEXT NOT NULL CHECK(stance_value IN ('supports','opposes','proposes_modification','neutral')),
      stance_description TEXT,
      arguments         TEXT NOT NULL,
      topics            TEXT NOT NULL,
      model             TEXT NOT NULL,
      prompt_version    TEXT NOT NULL DEFAULT 'v1',
      chunk_count       INTEGER DEFAULT 1,
      input_tokens      INTEGER,
      output_tokens     INTEGER,
      credits_used      REAL,
      analyzed_at       TEXT NOT NULL
    );
  `);

  return db;
}

export interface AnalysisRow {
  edk_identifier: string;
  summary: string;
  stance_value: string;
  stance_description: string | null;
  arguments: string;
  topics: string;
  model: string;
  prompt_version: string;
  chunk_count: number;
  input_tokens: number | null;
  output_tokens: number | null;
  credits_used: number | null;
  analyzed_at: string;
}

export function isAlreadyAnalyzed(
  db: Database,
  edkIdentifier: string,
  promptVersion: string,
): boolean {
  const row = db
    .query<{ cnt: number }, [string, string]>(
      `SELECT COUNT(*) as cnt FROM ExpertStatementAnalysis
       WHERE edk_identifier = ? AND prompt_version = ?`,
    )
    .get(edkIdentifier, promptVersion);
  return (row?.cnt ?? 0) > 0;
}

export function upsertAnalysis(
  db: Database,
  row: {
    edk_identifier: string;
    summary: string;
    stance_value: string;
    stance_description: string | null;
    arguments: string;
    topics: string;
    model: string;
    prompt_version: string;
    chunk_count: number;
    input_tokens: number | null;
    output_tokens: number | null;
    credits_used: number | null;
    analyzed_at: string;
  },
): void {
  db.run(
    `INSERT OR REPLACE INTO ExpertStatementAnalysis
     (edk_identifier, summary, stance_value, stance_description, arguments, topics,
      model, prompt_version, chunk_count, input_tokens, output_tokens, credits_used, analyzed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.edk_identifier,
      row.summary,
      row.stance_value,
      row.stance_description,
      row.arguments,
      row.topics,
      row.model,
      row.prompt_version,
      row.chunk_count,
      row.input_tokens,
      row.output_tokens,
      row.credits_used,
      row.analyzed_at,
    ],
  );
}

export function getAnalysisStats(db: Database): {
  total: number;
  completed: number;
  pending: number;
  totalCredits: number;
} {
  const completed = db
    .query<{ cnt: number }, []>(
      `SELECT COUNT(*) as cnt FROM ExpertStatementAnalysis`,
    )
    .get();

  const credits = db
    .query<{ total: number }, []>(
      `SELECT COALESCE(SUM(credits_used), 0) as total FROM ExpertStatementAnalysis`,
    )
    .get();

  return {
    total: 0,
    completed: completed?.cnt ?? 0,
    pending: 0,
    totalCredits: credits?.total ?? 0,
  };
}

export function loadAnalysisMap(
  dbPath: string,
  promptVersion?: string,
): Map<string, AnalysisRow> {
  const db = new Database(dbPath, { readonly: true });

  let rows: AnalysisRow[];
  if (promptVersion) {
    rows = db
      .query<AnalysisRow, [string]>(
        `SELECT * FROM ExpertStatementAnalysis WHERE prompt_version = ?`,
      )
      .all(promptVersion);
  } else {
    rows = db
      .query<AnalysisRow, []>(`SELECT * FROM ExpertStatementAnalysis`)
      .all();
  }

  db.close();

  const map = new Map<string, AnalysisRow>();
  for (const row of rows) {
    map.set(row.edk_identifier, row);
  }

  return map;
}

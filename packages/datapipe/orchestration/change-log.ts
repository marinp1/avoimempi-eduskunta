import { Database } from "bun:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";

export interface ParsedUpsertLogEntry {
  taskId: string;
  traceId: string;
  tableName: string;
  pkStartValue: number;
  pkEndValue: number;
  rowCount: number;
  createdAt?: string;
}

export interface ScraperRunLogEntry {
  taskId: string;
  traceId: string;
  tableName: string;
  mode: string;
  pkStartValue: number | null;
  pkEndValue: number | null;
  rowsScraped: number;
  createdAt?: string;
}

export class ParsedUpsertChangeLog {
  private readonly db: Database;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec(`
CREATE TABLE IF NOT EXISTS ParsedUpsertLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  pk_start_value INTEGER NOT NULL,
  pk_end_value INTEGER NOT NULL,
  row_count INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_parsed_upsert_log_table_time
  ON ParsedUpsertLog(table_name, created_at);

CREATE TABLE IF NOT EXISTS ScraperRunLog (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  task_id TEXT NOT NULL,
  trace_id TEXT NOT NULL,
  table_name TEXT NOT NULL,
  mode TEXT NOT NULL,
  pk_start_value INTEGER,
  pk_end_value INTEGER,
  rows_scraped INTEGER NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scraper_run_log_table_time
  ON ScraperRunLog(table_name, created_at);
`);
  }

  append(entry: ParsedUpsertLogEntry): void {
    const createdAt = entry.createdAt ?? new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO ParsedUpsertLog
          (task_id, trace_id, table_name, pk_start_value, pk_end_value, row_count, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.taskId,
        entry.traceId,
        entry.tableName,
        entry.pkStartValue,
        entry.pkEndValue,
        entry.rowCount,
        createdAt,
      );
  }

  appendScrape(entry: ScraperRunLogEntry): void {
    const createdAt = entry.createdAt ?? new Date().toISOString();

    this.db
      .prepare(
        `INSERT INTO ScraperRunLog
          (task_id, trace_id, table_name, mode, pk_start_value, pk_end_value, rows_scraped, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        entry.taskId,
        entry.traceId,
        entry.tableName,
        entry.mode,
        entry.pkStartValue,
        entry.pkEndValue,
        entry.rowsScraped,
        createdAt,
      );
  }

  close(): void {
    this.db.close();
  }
}

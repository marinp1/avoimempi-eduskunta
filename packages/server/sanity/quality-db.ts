import { Database } from "bun:sqlite";
import { getQualityDatabasePath } from "../../shared/database";

let qualityDb: Database | null = null;

export function getQualityDb(): Database {
  if (qualityDb) return qualityDb;

  const dbPath = getQualityDatabasePath();
  const db = new Database(dbPath, { create: true });
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec(`
    CREATE TABLE IF NOT EXISTS CheckResolution (
      check_id   TEXT PRIMARY KEY,
      status     TEXT NOT NULL,
      summary    TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ViolationComment (
      check_id      TEXT NOT NULL,
      violation_key TEXT NOT NULL,
      comment       TEXT NOT NULL,
      PRIMARY KEY (check_id, violation_key)
    );

    CREATE TABLE IF NOT EXISTS LastRunResult (
      id          INTEGER PRIMARY KEY CHECK (id = 1),
      result_json TEXT NOT NULL,
      ran_at      TEXT NOT NULL
    );
  `);

  qualityDb = db;
  return db;
}

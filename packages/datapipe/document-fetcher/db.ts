import { Database } from "bun:sqlite";
import { getDocumentsDatabasePath } from "#database";

export interface DocumentFileRecord {
  edk_identifier: string;
  vaski_guid: string | null;
  document_type: string | null;
  storage_key: string;
  fetched_at: string;
  file_size_bytes: number | null;
  http_status: number | null;
  error: string | null;
}

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS DocumentFile (
  edk_identifier  TEXT PRIMARY KEY,
  vaski_guid      TEXT,
  document_type   TEXT,
  storage_key     TEXT NOT NULL,
  fetched_at      TEXT NOT NULL,
  file_size_bytes INTEGER,
  http_status     INTEGER,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_document_file_vaski_guid ON DocumentFile(vaski_guid);
`;

export interface DocumentTextRecord {
  edk_identifier: string;
  body_text: string;
  extracted_at: string;
}

const CREATE_DOCUMENT_TEXT_SQL = `
CREATE TABLE IF NOT EXISTS DocumentText (
  edk_identifier TEXT PRIMARY KEY,
  body_text      TEXT NOT NULL,
  extracted_at   TEXT NOT NULL
);
`;

export function openDocumentsDb(): Database {
  const db = new Database(getDocumentsDatabasePath(), { create: true });
  db.run("PRAGMA journal_mode = WAL;");
  db.run(CREATE_TABLE_SQL);
  try {
    db.run("ALTER TABLE DocumentFile ADD COLUMN document_type TEXT");
  } catch (err) {
    if (!(err instanceof Error) || !err.message.includes("duplicate column"))
      throw err;
  }
  db.run(CREATE_DOCUMENT_TEXT_SQL);
  return db;
}

export function getDocumentText(
  db: Database,
  edkIdentifier: string,
): string | null {
  const row = db
    .query<{ body_text: string }, [string]>(
      "SELECT body_text FROM DocumentText WHERE edk_identifier = ?",
    )
    .get(edkIdentifier);
  return row?.body_text ?? null;
}

export function getAllDocumentTexts(db: Database): Map<string, string> {
  const rows = db
    .query<{ edk_identifier: string; body_text: string }, []>(
      "SELECT edk_identifier, body_text FROM DocumentText",
    )
    .all();
  const map = new Map<string, string>();
  for (const row of rows) {
    map.set(row.edk_identifier, row.body_text);
  }
  return map;
}

export function upsertDocumentText(
  db: Database,
  edkIdentifier: string,
  bodyText: string,
  extractedAt: string,
): void {
  db.run(
    `INSERT INTO DocumentText (edk_identifier, body_text, extracted_at)
     VALUES (?, ?, ?)
     ON CONFLICT(edk_identifier) DO UPDATE SET
       body_text = excluded.body_text,
       extracted_at = excluded.extracted_at`,
    [edkIdentifier, bodyText, extractedAt],
  );
}

export function getDocumentFile(
  db: Database,
  edkIdentifier: string,
): DocumentFileRecord | null {
  return db
    .query<DocumentFileRecord, [string]>(
      "SELECT * FROM DocumentFile WHERE edk_identifier = ?",
    )
    .get(edkIdentifier);
}

export function upsertDocumentFile(
  db: Database,
  record: DocumentFileRecord,
): void {
  db.run(
    `INSERT INTO DocumentFile (edk_identifier, vaski_guid, document_type, storage_key, fetched_at, file_size_bytes, http_status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(edk_identifier) DO UPDATE SET
       vaski_guid      = COALESCE(excluded.vaski_guid, DocumentFile.vaski_guid),
       document_type   = COALESCE(excluded.document_type, DocumentFile.document_type),
       storage_key     = excluded.storage_key,
       fetched_at      = excluded.fetched_at,
       file_size_bytes = excluded.file_size_bytes,
       http_status     = excluded.http_status,
       error           = excluded.error`,
    [
      record.edk_identifier,
      record.vaski_guid,
      record.document_type,
      record.storage_key,
      record.fetched_at,
      record.file_size_bytes,
      record.http_status,
      record.error,
    ],
  );
}

export interface DocumentFileCounts {
  total_vaski: number;
  fetched: number;
  errors: number;
  pending: number;
}

export interface DocumentFileCountsByType {
  document_type: string;
  total: number;
  fetched: number;
  errors: number;
  pending: number;
}

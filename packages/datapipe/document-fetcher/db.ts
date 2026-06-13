import { Database } from "bun:sqlite";
import { getDocumentsDatabasePath } from "#database";

export interface DocumentFileRecord {
  edk_identifier: string;
  vaski_guid: string | null;
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
  storage_key     TEXT NOT NULL,
  fetched_at      TEXT NOT NULL,
  file_size_bytes INTEGER,
  http_status     INTEGER,
  error           TEXT
);

CREATE INDEX IF NOT EXISTS idx_document_file_vaski_guid ON DocumentFile(vaski_guid);
`;

export function openDocumentsDb(): Database {
  const db = new Database(getDocumentsDatabasePath(), { create: true });
  db.run("PRAGMA journal_mode = WAL;");
  db.run(CREATE_TABLE_SQL);
  return db;
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
    `INSERT INTO DocumentFile (edk_identifier, vaski_guid, storage_key, fetched_at, file_size_bytes, http_status, error)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(edk_identifier) DO UPDATE SET
       vaski_guid      = COALESCE(excluded.vaski_guid, DocumentFile.vaski_guid),
       storage_key     = excluded.storage_key,
       fetched_at      = excluded.fetched_at,
       file_size_bytes = excluded.file_size_bytes,
       http_status     = excluded.http_status,
       error           = excluded.error`,
    [
      record.edk_identifier,
      record.vaski_guid,
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

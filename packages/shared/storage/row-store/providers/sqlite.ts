import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
  constants as zlibConstants,
} from "node:zlib";
import type { ColumnSchema, IRowStore, StoredRevision, StoredRow } from "../types";

type RowMode = "raw" | "parsed";
type CompressionCodec = "gzip" | "brotli";

type SqliteBlob = string | Uint8Array | ArrayBuffer;

const CURSOR_BATCH = 1_000;
const DATA_ENCODING_UTF8 = 0;
const DATA_ENCODING_GZIP = 1;
const DATA_ENCODING_BROTLI = 2;

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function schemaHash(pkName: string, columnNames: string[]): string {
  return sha256(JSON.stringify({ pkName, columnNames }));
}

function toBuffer(data: SqliteBlob): Buffer {
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (data instanceof Uint8Array) return Buffer.from(data);
  return Buffer.from(new Uint8Array(data));
}

function parseCompressionTables(rawValue: string | undefined): Set<string> {
  const value = rawValue ?? "*";
  return new Set(
    value
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean),
  );
}

function shouldCompress(
  tableName: string,
  compressedTables: Set<string>,
): boolean {
  return compressedTables.has("*") || compressedTables.has(tableName);
}

/** Element-wise diff between two JSON-array rows. Stores only changed positions. */
type ColumnDiff = Array<{ i: number; o: unknown }>;

function computeRowDiff(oldJson: string, newJson: string): ColumnDiff {
  try {
    const oldArr = JSON.parse(oldJson) as unknown[];
    const newArr = JSON.parse(newJson) as unknown[];
    const diff: ColumnDiff = [];
    const len = Math.max(oldArr.length, newArr.length);
    for (let i = 0; i < len; i++) {
      if (JSON.stringify(oldArr[i]) !== JSON.stringify(newArr[i])) {
        diff.push({ i, o: oldArr[i] });
      }
    }
    return diff;
  } catch {
    return [];
  }
}

function applyRowDiff(baseJson: string, diff: ColumnDiff): string {
  try {
    const arr = JSON.parse(baseJson) as unknown[];
    for (const { i, o } of diff) {
      arr[i] = o;
    }
    return JSON.stringify(arr);
  } catch {
    return baseJson;
  }
}

function encodeHexHash(hashHex: string): Uint8Array {
  return Buffer.from(hashHex, "hex");
}

function decodeHexHash(data: SqliteBlob): string {
  if (typeof data === "string") return data;
  return toBuffer(data).toString("hex");
}

function decodeUpdatedAt(value: number | string): string {
  if (typeof value === "number") return new Date(value).toISOString();
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return new Date(parsed).toISOString();
  return value;
}

export class SqliteRowStore implements IRowStore {
  private db: Database;
  private mode: RowMode;
  private tableIdCache = new Map<string, number>();
  private compressedTables: Set<string>;
  private compressionCodec: CompressionCodec;
  readonly name: string;

  constructor(dbPath: string, mode: RowMode) {
    this.mode = mode;
    this.name = `sqlite-${mode}(${dbPath})`;
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");

    this.compressedTables =
      mode === "raw"
        ? parseCompressionTables(
            process.env.RAW_ROW_STORE_COMPRESS_TABLES ??
              process.env.RAW_ROWSTORE_COMPRESS_TABLES,
          )
        : parseCompressionTables(
            process.env.PARSED_ROW_STORE_COMPRESS_TABLES ??
              process.env.PARSED_ROWSTORE_COMPRESS_TABLES,
          );
    this.compressionCodec =
      mode === "raw"
        ? ((process.env.RAW_ROW_STORE_COMPRESSION_CODEC ??
            "brotli") as CompressionCodec)
        : ((process.env.PARSED_ROW_STORE_COMPRESSION_CODEC ??
            "brotli") as CompressionCodec);

    this.initSchema();
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS table_refs (
        id   INTEGER PRIMARY KEY,
        name TEXT NOT NULL UNIQUE
      ) STRICT;
    `);

    if (this.mode === "raw") {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS column_schemas (
          hash         TEXT NOT NULL PRIMARY KEY,
          table_name   TEXT NOT NULL,
          pk_name      TEXT NOT NULL,
          column_names TEXT NOT NULL,
          first_seen   TEXT NOT NULL
        ) STRICT;
      `);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS rows (
          table_id      INTEGER NOT NULL,
          pk            INTEGER NOT NULL,
          column_hash   BLOB    NOT NULL,
          data          BLOB    NOT NULL,
          data_encoding INTEGER NOT NULL DEFAULT 0,
          hash          BLOB    NOT NULL,
          created_at    INTEGER NOT NULL DEFAULT 0,
          updated_at    INTEGER NOT NULL,
          PRIMARY KEY (table_id, pk),
          FOREIGN KEY (table_id) REFERENCES table_refs(id)
        ) STRICT;
      `);
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS row_revisions (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          table_id      INTEGER NOT NULL,
          pk            INTEGER NOT NULL,
          column_hash   BLOB    NOT NULL,
          hash          BLOB    NOT NULL,
          created_at    INTEGER NOT NULL DEFAULT 0,
          superseded_at INTEGER NOT NULL,
          diff          TEXT    NOT NULL,
          FOREIGN KEY (table_id) REFERENCES table_refs(id)
        ) STRICT;
      `);
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_row_revisions_lookup
          ON row_revisions(table_id, pk, superseded_at);
      `);
    } else {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS rows (
          table_id      INTEGER NOT NULL,
          pk            INTEGER NOT NULL,
          data          BLOB    NOT NULL,
          data_encoding INTEGER NOT NULL DEFAULT 0,
          hash          BLOB    NOT NULL,
          updated_at    INTEGER NOT NULL,
          PRIMARY KEY (table_id, pk),
          FOREIGN KEY (table_id) REFERENCES table_refs(id)
        ) STRICT;
      `);
    }

    this.assertSchemaCompatible();
  }

  private assertSchemaCompatible(): void {
    const columns = this.db.prepare(`PRAGMA table_info(rows)`).all() as Array<{
      name: string;
    }>;
    const names = new Set(columns.map((column) => column.name));

    if (!names.has("table_id") || !names.has("data_encoding")) {
      throw new Error(
        `${this.name} uses a legacy schema. Run: bun run rowstore:compact`,
      );
    }

    // Auto-migrate: add created_at if absent (existing rows get DEFAULT 0 = unknown).
    if (!names.has("created_at")) {
      this.db.exec(
        `ALTER TABLE rows ADD COLUMN created_at INTEGER NOT NULL DEFAULT 0`,
      );
    }

    // Auto-migrate row_revisions: if it exists but uses the old full-blob schema
    // (no diff column), drop and recreate — it was newly added with no real data.
    if (this.mode === "raw") {
      const revCols = this.db
        .prepare(`PRAGMA table_info(row_revisions)`)
        .all() as Array<{ name: string }>;
      const revNames = new Set(revCols.map((c) => c.name));
      if (revNames.size > 0 && !revNames.has("diff")) {
        this.db.exec(`DROP TABLE IF EXISTS row_revisions`);
        this.db.exec(`DROP INDEX IF EXISTS idx_row_revisions_lookup`);
        this.db.exec(`
          CREATE TABLE row_revisions (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            table_id      INTEGER NOT NULL,
            pk            INTEGER NOT NULL,
            column_hash   BLOB    NOT NULL,
            hash          BLOB    NOT NULL,
            created_at    INTEGER NOT NULL DEFAULT 0,
            superseded_at INTEGER NOT NULL,
            diff          TEXT    NOT NULL,
            FOREIGN KEY (table_id) REFERENCES table_refs(id)
          ) STRICT;
        `);
        this.db.exec(`
          CREATE INDEX idx_row_revisions_lookup
            ON row_revisions(table_id, pk, superseded_at);
        `);
      }
    }
  }

  private getTableId(tableName: string, createIfMissing = true): number | null {
    const cached = this.tableIdCache.get(tableName);
    if (cached !== undefined) return cached;

    const existing = this.db
      .prepare(`SELECT id FROM table_refs WHERE name = ?`)
      .get(tableName) as { id: number } | null;

    if (existing) {
      this.tableIdCache.set(tableName, existing.id);
      return existing.id;
    }

    if (!createIfMissing) return null;

    this.db
      .prepare(`INSERT OR IGNORE INTO table_refs (name) VALUES (?)`)
      .run(tableName);

    const inserted = this.db
      .prepare(`SELECT id FROM table_refs WHERE name = ?`)
      .get(tableName) as { id: number } | null;

    if (!inserted) return null;
    this.tableIdCache.set(tableName, inserted.id);
    return inserted.id;
  }

  private encodeData(
    tableName: string,
    data: string,
  ): { payload: Uint8Array; encoding: number } {
    if (shouldCompress(tableName, this.compressedTables)) {
      if (this.compressionCodec === "brotli") {
        return {
          payload: brotliCompressSync(Buffer.from(data, "utf8"), {
            params: {
              [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
            },
          }),
          encoding: DATA_ENCODING_BROTLI,
        };
      }
      return {
        payload: gzipSync(Buffer.from(data, "utf8")),
        encoding: DATA_ENCODING_GZIP,
      };
    }

    return {
      payload: Buffer.from(data, "utf8"),
      encoding: DATA_ENCODING_UTF8,
    };
  }

  private decodeData(data: SqliteBlob, encoding: number): string {
    if (typeof data === "string") return data;

    const bytes = toBuffer(data);
    if (encoding === DATA_ENCODING_BROTLI) {
      return brotliDecompressSync(bytes).toString("utf8");
    }
    if (encoding === DATA_ENCODING_GZIP) {
      return gunzipSync(bytes).toString("utf8");
    }

    return bytes.toString("utf8");
  }

  async upsertBatch(
    tableName: string,
    pkName: string,
    columnNames: string[],
    rows: Array<{ pk: number; data: string; hash?: string }>,
  ): Promise<void> {
    if (rows.length === 0) return;

    const now = Date.now();
    const nowIso = new Date(now).toISOString();

    const runTx = this.db.transaction(() => {
      const tableId = this.getTableId(tableName, true);
      if (tableId === null) {
        throw new Error(`Failed to resolve table id for ${tableName}`);
      }

      if (this.mode === "raw") {
        const colHashHex = schemaHash(pkName, columnNames);
        const colHash = encodeHexHash(colHashHex);

        this.db
          .prepare(
            `INSERT OR IGNORE INTO column_schemas (hash, table_name, pk_name, column_names, first_seen) VALUES (?, ?, ?, ?, ?)`,
          )
          .run(
            colHashHex,
            tableName,
            pkName,
            JSON.stringify(columnNames),
            nowIso,
          );

        // For any row whose hash will change, store a sparse diff of the old version.
        const selectExistingStmt = this.db.prepare(
          `SELECT pk, column_hash, data, data_encoding, hash, created_at FROM rows WHERE table_id = ? AND pk = ?`,
        );
        const insertRevStmt = this.db.prepare(
          `INSERT INTO row_revisions (table_id, pk, column_hash, hash, created_at, superseded_at, diff) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );

        // Upsert: set created_at only on insert; only update other fields when hash differs.
        const upsertStmt = this.db.prepare(`
          INSERT INTO rows (table_id, pk, column_hash, data, data_encoding, hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(table_id, pk) DO UPDATE SET
            column_hash   = excluded.column_hash,
            data          = excluded.data,
            data_encoding = excluded.data_encoding,
            hash          = excluded.hash,
            updated_at    = excluded.updated_at
          WHERE rows.hash != excluded.hash
        `);

        for (const row of rows) {
          const rowHashHex = row.hash ?? sha256(row.data);
          const encoded = this.encodeData(tableName, row.data);
          const rowHashBin = encodeHexHash(rowHashHex);

          const existing = selectExistingStmt.get(tableId, row.pk) as {
            pk: number;
            column_hash: SqliteBlob;
            data: SqliteBlob;
            data_encoding: number;
            hash: SqliteBlob;
            created_at: number;
          } | null;

          if (existing && decodeHexHash(existing.hash) !== rowHashHex) {
            const oldDataJson = this.decodeData(existing.data, existing.data_encoding);
            const diff = computeRowDiff(oldDataJson, row.data);
            insertRevStmt.run(
              tableId,
              row.pk,
              toBuffer(existing.column_hash),
              toBuffer(existing.hash),
              existing.created_at,
              now,
              JSON.stringify(diff),
            );
          }

          upsertStmt.run(
            tableId,
            row.pk,
            colHash,
            encoded.payload,
            encoded.encoding,
            rowHashBin,
            now, // created_at: only used on INSERT, ignored on UPDATE
            now, // updated_at
          );
        }
      } else {
        const stmt = this.db.prepare(`
          INSERT INTO rows (table_id, pk, data, data_encoding, hash, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(table_id, pk) DO UPDATE SET
            data          = excluded.data,
            data_encoding = excluded.data_encoding,
            hash          = excluded.hash,
            updated_at    = excluded.updated_at
          WHERE rows.hash != excluded.hash
        `);

        for (const row of rows) {
          const rowHashHex = row.hash ?? sha256(row.data);
          const encoded = this.encodeData(tableName, row.data);
          stmt.run(
            tableId,
            row.pk,
            encoded.payload,
            encoded.encoding,
            encodeHexHash(rowHashHex),
            now,
            now,
          );
        }
      }
    });

    runTx();
  }

  async get(tableName: string, pk: number): Promise<StoredRow | null> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return null;

    if (this.mode === "raw") {
      const row = this.db
        .prepare(
          `SELECT pk, column_hash, data, data_encoding, hash, created_at, updated_at FROM rows WHERE table_id = ? AND pk = ?`,
        )
        .get(tableId, pk) as {
        pk: number;
        column_hash: SqliteBlob;
        data: SqliteBlob;
        data_encoding: number;
        hash: SqliteBlob;
        created_at: number;
        updated_at: number | string;
      } | null;

      if (!row) return null;
      return {
        tableName,
        pk: row.pk,
        columnHash: decodeHexHash(row.column_hash),
        data: this.decodeData(row.data, row.data_encoding),
        hash: decodeHexHash(row.hash),
        createdAt: decodeUpdatedAt(row.created_at),
        updatedAt: decodeUpdatedAt(row.updated_at),
      };
    }

    const row = this.db
      .prepare(
        `SELECT pk, data, data_encoding, hash, created_at, updated_at FROM rows WHERE table_id = ? AND pk = ?`,
      )
      .get(tableId, pk) as {
      pk: number;
      data: SqliteBlob;
      data_encoding: number;
      hash: SqliteBlob;
      created_at: number;
      updated_at: number | string;
    } | null;

    if (!row) return null;
    return {
      tableName,
      pk: row.pk,
      columnHash: "",
      data: this.decodeData(row.data, row.data_encoding),
      hash: decodeHexHash(row.hash),
      createdAt: decodeUpdatedAt(row.created_at),
      updatedAt: decodeUpdatedAt(row.updated_at),
    };
  }

  async *list(tableName: string): AsyncIterable<StoredRow> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return;

    if (this.mode === "raw") {
      const stmt = this.db.prepare(
        `SELECT pk, column_hash, data, data_encoding, hash, created_at, updated_at FROM rows WHERE table_id = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
      );

      let lastPk = -1;
      while (true) {
        const rows = stmt.all(tableId, lastPk, CURSOR_BATCH) as Array<{
          pk: number;
          column_hash: SqliteBlob;
          data: SqliteBlob;
          data_encoding: number;
          hash: SqliteBlob;
          created_at: number;
          updated_at: number | string;
        }>;

        if (rows.length === 0) break;

        for (const row of rows) {
          yield {
            tableName,
            pk: row.pk,
            columnHash: decodeHexHash(row.column_hash),
            data: this.decodeData(row.data, row.data_encoding),
            hash: decodeHexHash(row.hash),
            createdAt: decodeUpdatedAt(row.created_at),
            updatedAt: decodeUpdatedAt(row.updated_at),
          };
          lastPk = row.pk;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
      return;
    }

    const stmt = this.db.prepare(
      `SELECT pk, data, data_encoding, hash, created_at, updated_at FROM rows WHERE table_id = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
    );

    let lastPk = -1;
    while (true) {
      const rows = stmt.all(tableId, lastPk, CURSOR_BATCH) as Array<{
        pk: number;
        data: SqliteBlob;
        data_encoding: number;
        hash: SqliteBlob;
        created_at: number;
        updated_at: number | string;
      }>;

      if (rows.length === 0) break;

      for (const row of rows) {
        yield {
          tableName,
          pk: row.pk,
          columnHash: "",
          data: this.decodeData(row.data, row.data_encoding),
          hash: decodeHexHash(row.hash),
          createdAt: decodeUpdatedAt(row.created_at),
          updatedAt: decodeUpdatedAt(row.updated_at),
        };
        lastPk = row.pk;
      }

      if (rows.length < CURSOR_BATCH) break;
    }
  }

  async getColumnSchema(hash: string): Promise<ColumnSchema | null> {
    if (this.mode !== "raw") return null;

    const row = this.db
      .prepare(
        `SELECT hash, table_name, pk_name, column_names, first_seen FROM column_schemas WHERE hash = ?`,
      )
      .get(hash) as {
      hash: string;
      table_name: string;
      pk_name: string;
      column_names: string;
      first_seen: string;
    } | null;

    if (!row) return null;
    return {
      hash: row.hash,
      tableName: row.table_name,
      pkName: row.pk_name,
      columnNames: JSON.parse(row.column_names) as string[],
      firstSeen: row.first_seen,
    };
  }

  async listColumnSchemas(tableName: string): Promise<ColumnSchema[]> {
    if (this.mode !== "raw") return [];

    const rows = this.db
      .prepare(
        `SELECT hash, table_name, pk_name, column_names, first_seen FROM column_schemas WHERE table_name = ?`,
      )
      .all(tableName) as Array<{
      hash: string;
      table_name: string;
      pk_name: string;
      column_names: string;
      first_seen: string;
    }>;

    return rows.map((row) => ({
      hash: row.hash,
      tableName: row.table_name,
      pkName: row.pk_name,
      columnNames: JSON.parse(row.column_names) as string[],
      firstSeen: row.first_seen,
    }));
  }

  async maxPk(tableName: string): Promise<number | null> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return null;

    const row = this.db
      .prepare(`SELECT MAX(pk) AS max_pk FROM rows WHERE table_id = ?`)
      .get(tableId) as { max_pk: number | null } | null;
    return row?.max_pk ?? null;
  }

  async count(tableName: string): Promise<number> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return 0;

    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM rows WHERE table_id = ?`)
      .get(tableId) as { cnt: number } | null;
    return row?.cnt ?? 0;
  }

  async lastUpdatedAt(tableName: string): Promise<string | null> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return null;

    const row = this.db
      .prepare(`SELECT MAX(updated_at) AS max_ts FROM rows WHERE table_id = ?`)
      .get(tableId) as { max_ts: number | string | null } | null;
    if (!row?.max_ts) return null;
    return decodeUpdatedAt(row.max_ts);
  }

  async tableNames(): Promise<string[]> {
    const rows = this.db
      .prepare(
        `SELECT tr.name AS table_name FROM table_refs tr WHERE EXISTS (SELECT 1 FROM rows r WHERE r.table_id = tr.id) ORDER BY tr.name`,
      )
      .all() as Array<{ table_name: string }>;
    return rows.map((row) => row.table_name);
  }

  async listChangedRows(
    tableName: string,
    sinceMs?: number,
  ): Promise<import("../types").ChangedRowSummary[]> {
    if (this.mode !== "raw") return [];

    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return [];

    const rows =
      sinceMs !== undefined
        ? (this.db
            .prepare(
              `SELECT r.pk, r.created_at, r.updated_at, COUNT(rr.id) AS revision_count
               FROM rows r
               JOIN row_revisions rr ON rr.table_id = r.table_id AND rr.pk = r.pk
               WHERE r.table_id = ? AND r.updated_at >= ?
               GROUP BY r.pk, r.created_at, r.updated_at
               ORDER BY r.updated_at DESC`,
            )
            .all(tableId, sinceMs) as Array<{
            pk: number;
            created_at: number;
            updated_at: number;
            revision_count: number;
          }>)
        : (this.db
            .prepare(
              `SELECT r.pk, r.created_at, r.updated_at, COUNT(rr.id) AS revision_count
               FROM rows r
               JOIN row_revisions rr ON rr.table_id = r.table_id AND rr.pk = r.pk
               WHERE r.table_id = ?
               GROUP BY r.pk, r.created_at, r.updated_at
               ORDER BY r.updated_at DESC`,
            )
            .all(tableId) as Array<{
            pk: number;
            created_at: number;
            updated_at: number;
            revision_count: number;
          }>);

    return rows.map((row) => ({
      pk: row.pk,
      revisionCount: row.revision_count,
      createdAt: decodeUpdatedAt(row.created_at),
      updatedAt: decodeUpdatedAt(row.updated_at),
    }));
  }

  async listRevisions(tableName: string, pk: number): Promise<StoredRevision[]> {
    if (this.mode !== "raw") return [];

    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return [];

    const revRows = this.db
      .prepare(
        `SELECT column_hash, hash, created_at, superseded_at, diff
         FROM row_revisions
         WHERE table_id = ? AND pk = ?
         ORDER BY superseded_at DESC`,
      )
      .all(tableId, pk) as Array<{
      column_hash: SqliteBlob;
      hash: SqliteBlob;
      created_at: number;
      superseded_at: number;
      diff: string;
    }>;

    if (revRows.length === 0) return [];

    // Reconstruct full historical data by working backwards from the current row.
    // Each diff records what changed going from the old version to the new one,
    // so applying it to the current state recovers the previous state.
    const currentRow = await this.get(tableName, pk);
    if (!currentRow) return [];

    let dataJson = currentRow.data;
    const revisions: StoredRevision[] = [];

    for (const row of revRows) {
      const diff = JSON.parse(row.diff) as ColumnDiff;
      dataJson = applyRowDiff(dataJson, diff);
      revisions.push({
        tableName,
        pk,
        columnHash: decodeHexHash(row.column_hash),
        data: dataJson,
        hash: decodeHexHash(row.hash),
        createdAt: decodeUpdatedAt(row.created_at),
        updatedAt: decodeUpdatedAt(row.superseded_at),
        supersededAt: decodeUpdatedAt(row.superseded_at),
      });
    }

    return revisions.reverse(); // Return oldest → newest
  }

  async delete(tableName: string, pk: number): Promise<void> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return;

    this.db
      .prepare(`DELETE FROM rows WHERE table_id = ? AND pk = ?`)
      .run(tableId, pk);
  }

  close(): void {
    this.db.close();
  }
}

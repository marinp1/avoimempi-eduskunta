import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import {
  brotliCompressSync,
  brotliDecompressSync,
  gunzipSync,
  gzipSync,
  constants as zlibConstants,
} from "node:zlib";
import type { ColumnSchema, IRowStore, StoredRow } from "../types";

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
          updated_at    INTEGER NOT NULL,
          PRIMARY KEY (table_id, pk),
          FOREIGN KEY (table_id) REFERENCES table_refs(id)
        ) STRICT;
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

        const stmt = this.db.prepare(
          `INSERT OR REPLACE INTO rows (table_id, pk, column_hash, data, data_encoding, hash, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        );

        for (const row of rows) {
          const rowHashHex = row.hash ?? sha256(row.data);
          const encoded = this.encodeData(tableName, row.data);
          stmt.run(
            tableId,
            row.pk,
            colHash,
            encoded.payload,
            encoded.encoding,
            encodeHexHash(rowHashHex),
            now,
          );
        }
      } else {
        const stmt = this.db.prepare(
          `INSERT OR REPLACE INTO rows (table_id, pk, data, data_encoding, hash, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        );

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
          `SELECT pk, column_hash, data, data_encoding, hash, updated_at FROM rows WHERE table_id = ? AND pk = ?`,
        )
        .get(tableId, pk) as {
        pk: number;
        column_hash: SqliteBlob;
        data: SqliteBlob;
        data_encoding: number;
        hash: SqliteBlob;
        updated_at: number | string;
      } | null;

      if (!row) return null;
      return {
        tableName,
        pk: row.pk,
        columnHash: decodeHexHash(row.column_hash),
        data: this.decodeData(row.data, row.data_encoding),
        hash: decodeHexHash(row.hash),
        updatedAt: decodeUpdatedAt(row.updated_at),
      };
    }

    const row = this.db
      .prepare(
        `SELECT pk, data, data_encoding, hash, updated_at FROM rows WHERE table_id = ? AND pk = ?`,
      )
      .get(tableId, pk) as {
      pk: number;
      data: SqliteBlob;
      data_encoding: number;
      hash: SqliteBlob;
      updated_at: number | string;
    } | null;

    if (!row) return null;
    return {
      tableName,
      pk: row.pk,
      columnHash: "",
      data: this.decodeData(row.data, row.data_encoding),
      hash: decodeHexHash(row.hash),
      updatedAt: decodeUpdatedAt(row.updated_at),
    };
  }

  async *list(tableName: string): AsyncIterable<StoredRow> {
    const tableId = this.getTableId(tableName, false);
    if (tableId === null) return;

    if (this.mode === "raw") {
      const stmt = this.db.prepare(
        `SELECT pk, column_hash, data, data_encoding, hash, updated_at FROM rows WHERE table_id = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
      );

      let lastPk = -1;
      while (true) {
        const rows = stmt.all(tableId, lastPk, CURSOR_BATCH) as Array<{
          pk: number;
          column_hash: SqliteBlob;
          data: SqliteBlob;
          data_encoding: number;
          hash: SqliteBlob;
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
            updatedAt: decodeUpdatedAt(row.updated_at),
          };
          lastPk = row.pk;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
      return;
    }

    const stmt = this.db.prepare(
      `SELECT pk, data, data_encoding, hash, updated_at FROM rows WHERE table_id = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
    );

    let lastPk = -1;
    while (true) {
      const rows = stmt.all(tableId, lastPk, CURSOR_BATCH) as Array<{
        pk: number;
        data: SqliteBlob;
        data_encoding: number;
        hash: SqliteBlob;
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

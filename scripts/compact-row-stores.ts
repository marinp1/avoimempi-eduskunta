import { existsSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { Database } from "bun:sqlite";
import {
  brotliCompressSync,
  brotliDecompressSync,
  constants as zlibConstants,
  gzipSync,
  gunzipSync,
} from "node:zlib";

type RowMode = "raw" | "parsed";
type CompressionCodec = "gzip" | "brotli";

type SqliteBlob = string | Uint8Array | ArrayBuffer;

const DATA_ENCODING_UTF8 = 0;
const DATA_ENCODING_GZIP = 1;
const DATA_ENCODING_BROTLI = 2;
const COPY_BATCH = 2_000;

function rowStoreDir(): string {
  if (process.env.ROW_STORE_DIR) return path.resolve(process.env.ROW_STORE_DIR);
  if (process.env.STORAGE_LOCAL_DIR) return path.resolve(process.env.STORAGE_LOCAL_DIR);
  return path.join(process.cwd(), "data");
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

function shouldCompressTable(name: string, selected: Set<string>): boolean {
  return selected.has("*") || selected.has(name);
}

function toBuffer(data: SqliteBlob): Buffer {
  if (typeof data === "string") return Buffer.from(data, "utf8");
  if (data instanceof Uint8Array) return Buffer.from(data);
  return Buffer.from(new Uint8Array(data));
}

function decodeByEncoding(data: SqliteBlob, encoding: number): Buffer {
  const bytes = toBuffer(data);
  if (encoding === DATA_ENCODING_BROTLI) return brotliDecompressSync(bytes);
  if (encoding === DATA_ENCODING_GZIP) return gunzipSync(bytes);
  return bytes;
}

function compressBuffer(data: Buffer, codec: CompressionCodec): { payload: Buffer; encoding: number } {
  if (codec === "brotli") {
    return {
      payload: brotliCompressSync(data, {
        params: {
          [zlibConstants.BROTLI_PARAM_QUALITY]: 4,
        },
      }),
      encoding: DATA_ENCODING_BROTLI,
    };
  }

  return {
    payload: gzipSync(data),
    encoding: DATA_ENCODING_GZIP,
  };
}

function encodeHexHash(hashHex: string): Uint8Array {
  return Buffer.from(hashHex, "hex");
}

function toHashBlob(value: SqliteBlob): Uint8Array {
  if (typeof value === "string") return encodeHexHash(value);
  return new Uint8Array(toBuffer(value));
}

function toUpdatedAtMs(value: number | string): number {
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  return 0;
}

function escapeSqlString(value: string): string {
  return value.replaceAll("'", "''");
}

function initDestinationSchema(db: Database, mode: RowMode): void {
  db.exec(`
    CREATE TABLE table_refs (
      id   INTEGER PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    ) STRICT;
  `);

  if (mode === "raw") {
    db.exec(`
      CREATE TABLE column_schemas (
        hash         TEXT NOT NULL PRIMARY KEY,
        table_name   TEXT NOT NULL,
        pk_name      TEXT NOT NULL,
        column_names TEXT NOT NULL,
        first_seen   TEXT NOT NULL
      ) STRICT;
    `);
    db.exec(`
      CREATE TABLE rows (
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
    db.exec(`
      CREATE TABLE rows (
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
}

function sourceHasColumn(db: Database, table: string, column: string): boolean {
  const rows = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return rows.some((row) => row.name === column);
}

function databaseBytes(db: Database): number {
  const pageCount = (
    db.prepare("PRAGMA page_count").get() as { page_count: number } | null
  )?.page_count;
  const pageSize = (
    db.prepare("PRAGMA page_size").get() as { page_size: number } | null
  )?.page_size;
  return (pageCount ?? 0) * (pageSize ?? 0);
}

function collectTableRefs(dst: Database): Array<{ id: number; name: string }> {
  return dst
    .prepare(`SELECT id, name FROM table_refs ORDER BY name`)
    .all() as Array<{ id: number; name: string }>;
}

function compactDatabase(
  mode: RowMode,
  dbPath: string,
  compressedTables: Set<string>,
  compressionCodec: CompressionCodec,
): void {
  if (!existsSync(dbPath)) {
    console.log(`⏭️  Skipping ${dbPath} (not found)`);
    return;
  }

  const tmpPath = `${dbPath}.compact.tmp`;
  if (existsSync(tmpPath)) rmSync(tmpPath);

  const src = new Database(dbPath);
  src.exec("PRAGMA busy_timeout = 60000;");
  src.exec("PRAGMA wal_checkpoint(TRUNCATE);");

  const legacyRows = sourceHasColumn(src, "rows", "table_name");
  const sourceHasEncoding = sourceHasColumn(src, "rows", "data_encoding");

  const beforeBytes = databaseBytes(src);

  const dst = new Database(tmpPath, { create: true });
  dst.exec("PRAGMA journal_mode = OFF;");
  dst.exec("PRAGMA synchronous = OFF;");
  dst.exec("PRAGMA temp_store = MEMORY;");
  dst.exec("PRAGMA cache_size = -200000;");
  initDestinationSchema(dst, mode);

  dst.exec(`ATTACH DATABASE '${escapeSqlString(dbPath)}' AS src;`);

  const tx = dst.transaction(() => {
    if (legacyRows) {
      dst.exec(`
        INSERT INTO table_refs(name)
        SELECT DISTINCT table_name FROM src.rows ORDER BY table_name;
      `);
    } else {
      dst.exec(`
        INSERT INTO table_refs(id, name)
        SELECT id, name FROM src.table_refs ORDER BY id;
      `);
    }

    if (mode === "raw") {
      dst.exec(`
        INSERT INTO column_schemas(hash, table_name, pk_name, column_names, first_seen)
        SELECT hash, table_name, pk_name, column_names, first_seen FROM src.column_schemas;
      `);
    }

    const tableRefs = collectTableRefs(dst);

    const insertRaw =
      mode === "raw"
        ? dst.prepare(`
            INSERT INTO rows(table_id, pk, column_hash, data, data_encoding, hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `)
        : null;

    const insertParsed =
      mode === "parsed"
        ? dst.prepare(`
            INSERT INTO rows(table_id, pk, data, data_encoding, hash, updated_at)
            VALUES (?, ?, ?, ?, ?, ?)
          `)
        : null;

    for (const table of tableRefs) {
      const tableId = table.id;
      const compressThisTable = shouldCompressTable(table.name, compressedTables);
      let lastPk = -1;
      let processed = 0;

      if (compressThisTable) {
        console.log(`🗜️  Compressing ${mode}:${table.name}`);
      }

      while (true) {
        if (mode === "raw") {
          let rows: Array<{
            pk: number;
            column_hash: SqliteBlob;
            data: SqliteBlob;
            data_encoding: number;
            hash: SqliteBlob;
            updated_at: number | string;
          }>;

          if (legacyRows) {
            rows = dst
              .prepare(`
                SELECT s.pk, s.column_hash, s.data, ${DATA_ENCODING_UTF8} AS data_encoding, s.hash, s.updated_at
                FROM src.rows s
                WHERE s.table_name = ? AND s.pk > ?
                ORDER BY s.pk ASC
                LIMIT ?
              `)
              .all(table.name, lastPk, COPY_BATCH) as Array<{
              pk: number;
              column_hash: SqliteBlob;
              data: SqliteBlob;
              data_encoding: number;
              hash: SqliteBlob;
              updated_at: string;
            }>;
          } else {
            rows = dst
              .prepare(`
                SELECT pk, column_hash, data, data_encoding, hash, updated_at
                FROM src.rows
                WHERE table_id = ? AND pk > ?
                ORDER BY pk ASC
                LIMIT ?
              `)
              .all(tableId, lastPk, COPY_BATCH) as Array<{
              pk: number;
              column_hash: SqliteBlob;
              data: SqliteBlob;
              data_encoding: number;
              hash: SqliteBlob;
              updated_at: string;
            }>;
          }

          if (rows.length === 0) break;

          for (const row of rows) {
            const plain = decodeByEncoding(row.data, row.data_encoding);
            const compressed = compressThisTable
              ? compressBuffer(plain, compressionCodec)
              : null;
            insertRaw?.run(
              tableId,
              row.pk,
              toHashBlob(row.column_hash),
              compressed?.payload ?? plain,
              compressed?.encoding ?? DATA_ENCODING_UTF8,
              toHashBlob(row.hash),
              toUpdatedAtMs(row.updated_at),
            );
          }

          processed += rows.length;
          lastPk = rows[rows.length - 1].pk;
          if (processed % 100_000 === 0) {
            console.log(`   ${table.name}: ${processed.toLocaleString()} rows`);
          }
        } else {
          let rows: Array<{
            pk: number;
            data: SqliteBlob;
            data_encoding: number;
            hash: SqliteBlob;
            updated_at: number | string;
          }>;

          if (legacyRows) {
            rows = dst
              .prepare(`
                SELECT s.pk, s.data, ${DATA_ENCODING_UTF8} AS data_encoding, s.hash, s.updated_at
                FROM src.rows s
                WHERE s.table_name = ? AND s.pk > ?
                ORDER BY s.pk ASC
                LIMIT ?
              `)
              .all(table.name, lastPk, COPY_BATCH) as Array<{
              pk: number;
              data: SqliteBlob;
              data_encoding: number;
              hash: SqliteBlob;
              updated_at: string;
            }>;
          } else {
            rows = dst
              .prepare(`
                SELECT pk, data, data_encoding, hash, updated_at
                FROM src.rows
                WHERE table_id = ? AND pk > ?
                ORDER BY pk ASC
                LIMIT ?
              `)
              .all(tableId, lastPk, COPY_BATCH) as Array<{
              pk: number;
              data: SqliteBlob;
              data_encoding: number;
              hash: SqliteBlob;
              updated_at: string;
            }>;
          }

          if (rows.length === 0) break;

          for (const row of rows) {
            const plain = decodeByEncoding(row.data, row.data_encoding);
            const compressed = compressThisTable
              ? compressBuffer(plain, compressionCodec)
              : null;
            insertParsed?.run(
              tableId,
              row.pk,
              compressed?.payload ?? plain,
              compressed?.encoding ?? DATA_ENCODING_UTF8,
              toHashBlob(row.hash),
              toUpdatedAtMs(row.updated_at),
            );
          }

          processed += rows.length;
          lastPk = rows[rows.length - 1].pk;
          if (processed % 100_000 === 0) {
            console.log(`   ${table.name}: ${processed.toLocaleString()} rows`);
          }
        }
      }

      if (compressThisTable) {
        console.log(`   ${table.name}: ${processed.toLocaleString()} rows compressed`);
      }
    }
  });

  tx();

  dst.exec("DETACH DATABASE src;");
  dst.exec("VACUUM;");
  dst.close();
  src.close();

  renameSync(tmpPath, dbPath);

  const verify = new Database(dbPath);
  const afterBytes = databaseBytes(verify);
  verify.close();

  const savedMb = ((beforeBytes - afterBytes) / 1024 / 1024).toFixed(1);
  console.log(
    `✅ ${mode}.db compacted: ${(beforeBytes / 1024 / 1024).toFixed(1)} MB -> ${(afterBytes / 1024 / 1024).toFixed(1)} MB (saved ${savedMb} MB)`,
  );
}

function main(): void {
  const modeArg = process.argv[2];
  const runRaw = modeArg !== "parsed-only";
  const runParsed = modeArg !== "raw-only";
  const dir = rowStoreDir();
  const rawCompressedTables = parseCompressionTables(
    process.env.RAW_ROW_STORE_COMPRESS_TABLES,
  );
  const parsedCompressedTables = parseCompressionTables(
    process.env.PARSED_ROW_STORE_COMPRESS_TABLES,
  );
  const rawCompressionCodec =
    (process.env.RAW_ROW_STORE_COMPRESSION_CODEC as CompressionCodec | undefined) ??
    "brotli";
  const parsedCompressionCodec =
    (process.env.PARSED_ROW_STORE_COMPRESSION_CODEC as CompressionCodec | undefined) ??
    "brotli";

  console.log(`📁 Row store dir: ${dir}`);
  console.log(
    `🗜️  Raw compressed tables: ${[...rawCompressedTables].join(", ") || "(none)"}`,
  );
  console.log(
    `🗜️  Parsed compressed tables: ${[...parsedCompressedTables].join(", ") || "(none)"}`,
  );
  console.log(`🧩 Raw compression codec: ${rawCompressionCodec}`);
  console.log(`🧩 Parsed compression codec: ${parsedCompressionCodec}`);

  if (runRaw) {
    compactDatabase(
      "raw",
      path.join(dir, "raw.db"),
      rawCompressedTables,
      rawCompressionCodec,
    );
  }
  if (runParsed) {
    compactDatabase(
      "parsed",
      path.join(dir, "parsed.db"),
      parsedCompressedTables,
      parsedCompressionCodec,
    );
  }
}

main();

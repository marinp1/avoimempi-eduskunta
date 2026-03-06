import { createHash } from "node:crypto";
import postgres from "postgres";
import type { ColumnSchema, IRowStore, StoredRevision, StoredRow } from "../types";

type RowMode = "raw" | "parsed";

const CURSOR_BATCH = 1_000;
const UPSERT_CHUNK = 500;

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function schemaHash(pkName: string, columnNames: string[]): string {
  return sha256(JSON.stringify({ pkName, columnNames }));
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export class PostgresRowStore implements IRowStore {
  private sql: postgres.Sql;
  private mode: RowMode;
  private initPromise: Promise<void>;
  readonly name: string;

  /** Table used for row storage. */
  private readonly rowsTable: string;

  constructor(connectionUrl: string, mode: RowMode) {
    this.mode = mode;
    this.name = `postgres-${mode}(${connectionUrl})`;
    this.sql = postgres(connectionUrl, { max: 5, idle_timeout: 30 });
    this.rowsTable = mode === "raw" ? "raw_rows" : "parsed_rows";
    this.initPromise = this.initSchema();
  }

  private async initSchema(): Promise<void> {
    if (this.mode === "raw") {
      await this.sql`
        CREATE TABLE IF NOT EXISTS raw_column_schemas (
          hash        TEXT NOT NULL PRIMARY KEY,
          table_name  TEXT NOT NULL,
          pk_name     TEXT NOT NULL,
          column_names TEXT NOT NULL,
          first_seen  TEXT NOT NULL
        )
      `;
      await this.sql`
        CREATE TABLE IF NOT EXISTS raw_rows (
          table_name  TEXT    NOT NULL,
          pk          INTEGER NOT NULL,
          column_hash TEXT    NOT NULL,
          data        TEXT    NOT NULL,
          hash        TEXT    NOT NULL,
          updated_at  TEXT    NOT NULL,
          PRIMARY KEY (table_name, pk)
        )
      `;
      await this.sql`
        CREATE INDEX IF NOT EXISTS idx_raw_rows_table_name ON raw_rows(table_name)
      `;
    } else {
      await this.sql`
        CREATE TABLE IF NOT EXISTS parsed_rows (
          table_name TEXT    NOT NULL,
          pk         INTEGER NOT NULL,
          data       TEXT    NOT NULL,
          hash       TEXT    NOT NULL,
          updated_at TEXT    NOT NULL,
          PRIMARY KEY (table_name, pk)
        )
      `;
      await this.sql`
        CREATE INDEX IF NOT EXISTS idx_parsed_rows_table_name ON parsed_rows(table_name)
      `;
    }
  }

  async upsertBatch(
    tableName: string,
    pkName: string,
    columnNames: string[],
    rows: Array<{ pk: number; data: string; hash?: string }>,
  ): Promise<void> {
    if (rows.length === 0) return;
    await this.initPromise;

    const now = new Date().toISOString();

    await this.sql.begin(async (txRaw) => {
      const tx = txRaw as unknown as postgres.Sql;

      if (this.mode === "raw") {
        const colHash = schemaHash(pkName, columnNames);

        await tx`
          INSERT INTO raw_column_schemas (hash, table_name, pk_name, column_names, first_seen)
          VALUES (${colHash}, ${tableName}, ${pkName}, ${JSON.stringify(columnNames)}, ${now})
          ON CONFLICT (hash) DO NOTHING
        `;

        const chunks = chunkArray(rows, UPSERT_CHUNK);
        for (const chunk of chunks) {
          const records = chunk.map((row) => ({
            table_name: tableName,
            pk: row.pk,
            column_hash: colHash,
            data: row.data,
            hash: row.hash ?? sha256(row.data),
            updated_at: now,
          }));

          await tx`
            INSERT INTO raw_rows ${tx(records)}
            ON CONFLICT (table_name, pk) DO UPDATE SET
              column_hash = EXCLUDED.column_hash,
              data        = EXCLUDED.data,
              hash        = EXCLUDED.hash,
              updated_at  = EXCLUDED.updated_at
          `;
        }
      } else {
        const chunks = chunkArray(rows, UPSERT_CHUNK);
        for (const chunk of chunks) {
          const records = chunk.map((row) => ({
            table_name: tableName,
            pk: row.pk,
            data: row.data,
            hash: row.hash ?? sha256(row.data),
            updated_at: now,
          }));

          await tx`
            INSERT INTO parsed_rows ${tx(records)}
            ON CONFLICT (table_name, pk) DO UPDATE SET
              data       = EXCLUDED.data,
              hash       = EXCLUDED.hash,
              updated_at = EXCLUDED.updated_at
          `;
        }
      }
    });
  }

  async get(tableName: string, pk: number): Promise<StoredRow | null> {
    await this.initPromise;

    if (this.mode === "raw") {
      const rows = await this.sql`
        SELECT table_name, pk, column_hash, data, hash, updated_at
        FROM ${this.sql(this.rowsTable)}
        WHERE table_name = ${tableName} AND pk = ${pk}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        tableName: row.table_name as string,
        pk: row.pk as number,
        columnHash: row.column_hash as string,
        data: row.data as string,
        hash: row.hash as string,
        createdAt: row.updated_at as string,
        updatedAt: row.updated_at as string,
      };
    } else {
      const rows = await this.sql`
        SELECT table_name, pk, data, hash, updated_at
        FROM ${this.sql(this.rowsTable)}
        WHERE table_name = ${tableName} AND pk = ${pk}
      `;
      if (rows.length === 0) return null;
      const row = rows[0];
      return {
        tableName: row.table_name as string,
        pk: row.pk as number,
        columnHash: "",
        data: row.data as string,
        hash: row.hash as string,
        createdAt: row.updated_at as string,
        updatedAt: row.updated_at as string,
      };
    }
  }

  async *list(tableName: string): AsyncIterable<StoredRow> {
    await this.initPromise;

    if (this.mode === "raw") {
      let lastPk = -1;
      while (true) {
        const rows = await this.sql`
          SELECT table_name, pk, column_hash, data, hash, updated_at
          FROM ${this.sql(this.rowsTable)}
          WHERE table_name = ${tableName} AND pk > ${lastPk}
          ORDER BY pk ASC
          LIMIT ${CURSOR_BATCH}
        `;

        if (rows.length === 0) break;

        for (const row of rows) {
          yield {
            tableName: row.table_name as string,
            pk: row.pk as number,
            columnHash: row.column_hash as string,
            data: row.data as string,
            hash: row.hash as string,
            createdAt: row.updated_at as string,
            updatedAt: row.updated_at as string,
          };
          lastPk = row.pk as number;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
    } else {
      let lastPk = -1;
      while (true) {
        const rows = await this.sql`
          SELECT table_name, pk, data, hash, updated_at
          FROM ${this.sql(this.rowsTable)}
          WHERE table_name = ${tableName} AND pk > ${lastPk}
          ORDER BY pk ASC
          LIMIT ${CURSOR_BATCH}
        `;

        if (rows.length === 0) break;

        for (const row of rows) {
          yield {
            tableName: row.table_name as string,
            pk: row.pk as number,
            columnHash: "",
            data: row.data as string,
            hash: row.hash as string,
            createdAt: row.updated_at as string,
            updatedAt: row.updated_at as string,
          };
          lastPk = row.pk as number;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
    }
  }

  async getColumnSchema(hash: string): Promise<ColumnSchema | null> {
    if (this.mode !== "raw") return null;
    await this.initPromise;

    const rows = await this.sql`
      SELECT hash, table_name, pk_name, column_names, first_seen
      FROM raw_column_schemas
      WHERE hash = ${hash}
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      hash: row.hash as string,
      tableName: row.table_name as string,
      pkName: row.pk_name as string,
      columnNames: JSON.parse(row.column_names as string) as string[],
      firstSeen: row.first_seen as string,
    };
  }

  async listColumnSchemas(tableName: string): Promise<ColumnSchema[]> {
    if (this.mode !== "raw") return [];
    await this.initPromise;

    const rows = await this.sql`
      SELECT hash, table_name, pk_name, column_names, first_seen
      FROM raw_column_schemas
      WHERE table_name = ${tableName}
    `;
    return rows.map((row) => ({
      hash: row.hash as string,
      tableName: row.table_name as string,
      pkName: row.pk_name as string,
      columnNames: JSON.parse(row.column_names as string) as string[],
      firstSeen: row.first_seen as string,
    }));
  }

  async maxPk(tableName: string): Promise<number | null> {
    await this.initPromise;

    const rows = await this.sql`
      SELECT MAX(pk) AS max_pk
      FROM ${this.sql(this.rowsTable)}
      WHERE table_name = ${tableName}
    `;
    return (rows[0]?.max_pk as number | null) ?? null;
  }

  async count(tableName: string): Promise<number> {
    await this.initPromise;

    const rows = await this.sql`
      SELECT COUNT(*) AS cnt
      FROM ${this.sql(this.rowsTable)}
      WHERE table_name = ${tableName}
    `;
    return parseInt(rows[0]?.cnt ?? "0", 10);
  }

  async lastUpdatedAt(tableName: string): Promise<string | null> {
    await this.initPromise;

    const rows = await this.sql`
      SELECT MAX(updated_at) AS max_ts
      FROM ${this.sql(this.rowsTable)}
      WHERE table_name = ${tableName}
    `;
    return (rows[0]?.max_ts as string | null) ?? null;
  }

  async tableNames(): Promise<string[]> {
    await this.initPromise;

    const rows = await this.sql`
      SELECT DISTINCT table_name
      FROM ${this.sql(this.rowsTable)}
      ORDER BY table_name
    `;
    return rows.map((row) => row.table_name as string);
  }

  async listRevisions(
    _tableName: string,
    _pk: number,
  ): Promise<StoredRevision[]> {
    return [];
  }

  async listChangedRows(
    _tableName: string,
    _sinceMs?: number,
  ): Promise<import("../types").ChangedRowSummary[]> {
    return [];
  }

  async countNewRows(_tableName: string, _sinceMs: number): Promise<number> {
    return 0;
  }

  async delete(tableName: string, pk: number): Promise<void> {
    await this.initPromise;

    await this.sql`
      DELETE FROM ${this.sql(this.rowsTable)}
      WHERE table_name = ${tableName} AND pk = ${pk}
    `;
  }

  close(): void {
    void this.sql.end();
  }
}

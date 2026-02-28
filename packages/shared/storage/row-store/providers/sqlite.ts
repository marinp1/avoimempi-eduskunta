import { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import type { ColumnSchema, IRowStore, StoredRow } from "../types";

type RowMode = "raw" | "parsed";

const CURSOR_BATCH = 1_000;

function sha256(data: string): string {
  return createHash("sha256").update(data).digest("hex");
}

function schemaHash(pkName: string, columnNames: string[]): string {
  return sha256(JSON.stringify({ pkName, columnNames }));
}

export class SqliteRowStore implements IRowStore {
  private db: Database;
  private mode: RowMode;
  readonly name: string;

  constructor(dbPath: string, mode: RowMode) {
    this.mode = mode;
    this.name = `sqlite-${mode}(${dbPath})`;
    this.db = new Database(dbPath, { create: true });
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.initSchema();
  }

  private initSchema(): void {
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
          table_name   TEXT    NOT NULL,
          pk           INTEGER NOT NULL,
          column_hash  TEXT    NOT NULL,
          data         TEXT    NOT NULL,
          hash         TEXT    NOT NULL,
          updated_at   TEXT    NOT NULL,
          PRIMARY KEY (table_name, pk)
        ) STRICT;
      `);
    } else {
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS rows (
          table_name TEXT    NOT NULL,
          pk         INTEGER NOT NULL,
          data       TEXT    NOT NULL,
          hash       TEXT    NOT NULL,
          updated_at TEXT    NOT NULL,
          PRIMARY KEY (table_name, pk)
        ) STRICT;
      `);
    }
  }

  async upsertBatch(
    tableName: string,
    pkName: string,
    columnNames: string[],
    rows: Array<{ pk: number; data: string; hash?: string }>,
  ): Promise<void> {
    if (rows.length === 0) return;

    const now = new Date().toISOString();

    const runTx = this.db.transaction(() => {
      if (this.mode === "raw") {
        const colHash = schemaHash(pkName, columnNames);

        this.db
          .prepare(
            `INSERT OR IGNORE INTO column_schemas (hash, table_name, pk_name, column_names, first_seen) VALUES (?, ?, ?, ?, ?)`,
          )
          .run(colHash, tableName, pkName, JSON.stringify(columnNames), now);

        const stmt = this.db.prepare(
          `INSERT OR REPLACE INTO rows (table_name, pk, column_hash, data, hash, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
        );

        for (const row of rows) {
          const rowHash = row.hash ?? sha256(row.data);
          stmt.run(tableName, row.pk, colHash, row.data, rowHash, now);
        }
      } else {
        const stmt = this.db.prepare(
          `INSERT OR REPLACE INTO rows (table_name, pk, data, hash, updated_at) VALUES (?, ?, ?, ?, ?)`,
        );

        for (const row of rows) {
          const rowHash = row.hash ?? sha256(row.data);
          stmt.run(tableName, row.pk, row.data, rowHash, now);
        }
      }
    });

    runTx();
  }

  async get(tableName: string, pk: number): Promise<StoredRow | null> {
    if (this.mode === "raw") {
      const row = this.db
        .prepare(
          `SELECT table_name, pk, column_hash, data, hash, updated_at FROM rows WHERE table_name = ? AND pk = ?`,
        )
        .get(tableName, pk) as {
        table_name: string;
        pk: number;
        column_hash: string;
        data: string;
        hash: string;
        updated_at: string;
      } | null;

      if (!row) return null;
      return {
        tableName: row.table_name,
        pk: row.pk,
        columnHash: row.column_hash,
        data: row.data,
        hash: row.hash,
        updatedAt: row.updated_at,
      };
    } else {
      const row = this.db
        .prepare(
          `SELECT table_name, pk, data, hash, updated_at FROM rows WHERE table_name = ? AND pk = ?`,
        )
        .get(tableName, pk) as {
        table_name: string;
        pk: number;
        data: string;
        hash: string;
        updated_at: string;
      } | null;

      if (!row) return null;
      return {
        tableName: row.table_name,
        pk: row.pk,
        columnHash: "",
        data: row.data,
        hash: row.hash,
        updatedAt: row.updated_at,
      };
    }
  }

  async *list(tableName: string): AsyncIterable<StoredRow> {
    if (this.mode === "raw") {
      const stmt = this.db.prepare(
        `SELECT table_name, pk, column_hash, data, hash, updated_at FROM rows WHERE table_name = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
      );

      let lastPk = -1;
      while (true) {
        const rows = stmt.all(tableName, lastPk, CURSOR_BATCH) as Array<{
          table_name: string;
          pk: number;
          column_hash: string;
          data: string;
          hash: string;
          updated_at: string;
        }>;

        if (rows.length === 0) break;

        for (const row of rows) {
          yield {
            tableName: row.table_name,
            pk: row.pk,
            columnHash: row.column_hash,
            data: row.data,
            hash: row.hash,
            updatedAt: row.updated_at,
          };
          lastPk = row.pk;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
    } else {
      const stmt = this.db.prepare(
        `SELECT table_name, pk, data, hash, updated_at FROM rows WHERE table_name = ? AND pk > ? ORDER BY pk ASC LIMIT ?`,
      );

      let lastPk = -1;
      while (true) {
        const rows = stmt.all(tableName, lastPk, CURSOR_BATCH) as Array<{
          table_name: string;
          pk: number;
          data: string;
          hash: string;
          updated_at: string;
        }>;

        if (rows.length === 0) break;

        for (const row of rows) {
          yield {
            tableName: row.table_name,
            pk: row.pk,
            columnHash: "",
            data: row.data,
            hash: row.hash,
            updatedAt: row.updated_at,
          };
          lastPk = row.pk;
        }

        if (rows.length < CURSOR_BATCH) break;
      }
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
    const row = this.db
      .prepare(`SELECT MAX(pk) AS max_pk FROM rows WHERE table_name = ?`)
      .get(tableName) as { max_pk: number | null } | null;
    return row?.max_pk ?? null;
  }

  async count(tableName: string): Promise<number> {
    const row = this.db
      .prepare(`SELECT COUNT(*) AS cnt FROM rows WHERE table_name = ?`)
      .get(tableName) as { cnt: number } | null;
    return row?.cnt ?? 0;
  }

  async lastUpdatedAt(tableName: string): Promise<string | null> {
    const row = this.db
      .prepare(
        `SELECT MAX(updated_at) AS max_ts FROM rows WHERE table_name = ?`,
      )
      .get(tableName) as { max_ts: string | null } | null;
    return row?.max_ts ?? null;
  }

  async tableNames(): Promise<string[]> {
    const rows = this.db
      .prepare(
        `SELECT DISTINCT table_name FROM rows ORDER BY table_name`,
      )
      .all() as Array<{ table_name: string }>;
    return rows.map((row) => row.table_name);
  }

  async delete(tableName: string, pk: number): Promise<void> {
    this.db
      .prepare(`DELETE FROM rows WHERE table_name = ? AND pk = ?`)
      .run(tableName, pk);
  }

  close(): void {
    this.db.close();
  }
}

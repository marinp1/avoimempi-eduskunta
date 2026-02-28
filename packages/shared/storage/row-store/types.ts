/**
 * Row-level storage abstraction for the data pipeline.
 *
 * Two DB files:
 *   data/raw.db    — scraper writes here (faithful to API format)
 *   data/parsed.db — parser writes here (self-describing objects)
 */

export interface StoredRow {
  tableName: string;
  pk: number;
  /** raw store: SHA-256 of column schema; parsed store: empty string */
  columnHash: string;
  /** raw: JSON array [v1,v2,...]; parsed: JSON object {Col:val,...} */
  data: string;
  /** SHA-256 of the raw values array (same in both stores) */
  hash: string;
  /** ISO timestamp */
  updatedAt: string;
}

export interface ColumnSchema {
  hash: string;
  tableName: string;
  pkName: string;
  /** Ordered column names, matching data array positions */
  columnNames: string[];
  firstSeen: string;
}

export interface IRowStore {
  readonly name: string;

  /**
   * Upsert many rows in a single transaction.
   * columnNames + pkName are used to auto-upsert the column schema (no-op if hash unchanged).
   * Hash is computed from data unless explicitly provided (provide for parsed store to propagate raw hash).
   */
  upsertBatch(
    tableName: string,
    pkName: string,
    columnNames: string[],
    rows: Array<{ pk: number; data: string; hash?: string }>,
  ): Promise<void>;

  /** Get a single row by (tableName, pk). */
  get(tableName: string, pk: number): Promise<StoredRow | null>;

  /** Iterate all rows for a table ordered by pk ascending. */
  list(tableName: string): AsyncIterable<StoredRow>;

  /** Look up a column schema by its hash. Used by parser during row processing. */
  getColumnSchema(hash: string): Promise<ColumnSchema | null>;

  /** All distinct column schemas seen for a table (multiple if columns changed over time). */
  listColumnSchemas(tableName: string): Promise<ColumnSchema[]>;

  /** Highest pk stored for a table, or null if empty. Used for resume. */
  maxPk(tableName: string): Promise<number | null>;

  /** Row count for a table. */
  count(tableName: string): Promise<number>;

  /** Most recent updated_at timestamp for a table, or null if empty. */
  lastUpdatedAt(tableName: string): Promise<string | null>;

  /** All table names that have at least one row. */
  tableNames(): Promise<string[]>;

  /** Delete a single row. */
  delete(tableName: string, pk: number): Promise<void>;

  /** Close DB connections. */
  close(): void;
}

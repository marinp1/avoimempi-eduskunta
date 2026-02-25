import type { Database, Statement } from "bun:sqlite";

/**
 * SQLite has a limit on the number of bind parameters (SQLITE_MAX_VARIABLE_NUMBER)
 * Modern SQLite (3.32.0+) supports up to 32766 bind parameters.
 * Bun uses a recent SQLite version, so we can use the higher limit.
 */
const SQLITE_MAX_BIND_PARAMS = 32766;

/**
 * Default batch size for multi-row inserts
 * This will be adjusted based on column count to stay under SQLITE_MAX_BIND_PARAMS
 * Setting to 5000 allows most tables to use large batches
 */
const DEFAULT_BATCH_SIZE = 5000;

/**
 * Cache for prepared statements to enable reuse across multiple insert operations
 */
const statementCache = new Map<string, Statement>();

/**
 * Calculate optimal batch size based on column count and SQLite limits
 */
const calculateBatchSize = (columnCount: number): number => {
  // Calculate max rows per batch based on SQLite bind parameter limit
  const maxRowsFromLimit = Math.floor(SQLITE_MAX_BIND_PARAMS / columnCount);

  // Use the smaller of the calculated limit or our default batch size
  return Math.min(maxRowsFromLimit, DEFAULT_BATCH_SIZE);
};

/**
 * Get or create a prepared statement for batch inserting rows into a table
 */
const getBatchPreparedStatement = (
  db: Database,
  table: string,
  columns: string[],
  batchSize: number,
): Statement => {
  const cacheKey = `${table}:${columns.join(",")}:${batchSize}`;

  if (statementCache.has(cacheKey)) {
    return statementCache.get(cacheKey)!;
  }

  const columnsString = columns.join(", ");
  const singleRowPlaceholders = columns.map(() => "?").join(", ");

  // Create multi-row VALUES clause: (?, ?, ?), (?, ?, ?), ...
  const valuesClauses = Array(batchSize)
    .fill(`(${singleRowPlaceholders})`)
    .join(", ");

  const sql = `INSERT OR IGNORE INTO ${table} (${columnsString}) VALUES ${valuesClauses}`;

  const stmt = db.prepare(sql);
  statementCache.set(cacheKey, stmt);

  return stmt;
};

/**
 * Clear the statement cache (useful between migrations or for testing)
 */
export const clearStatementCache = () => {
  statementCache.clear();
};

/**
 * Normalize a value for SQLite insertion
 */
const normalizeValue = (value: any): any => {
  if (value === null || value === undefined) return null;
  if (value === 0) return 0;
  return value;
};

/**
 * Optimized insert function using prepared statements and batch processing
 *
 * Performance optimizations:
 * - Uses prepared statements (reused across calls)
 * - Multi-row batch inserts (2x faster than single-row)
 * - Respects SQLite bind parameter limits
 * - No string concatenation for SQL values
 * - Proper parameter binding
 */
export const insertRows = (db: Database) => (table: string, rows: any[]) => {
  if (rows.length === 0) return;

  const columns = Object.keys(rows[0]);
  const columnCount = columns.length;
  const batchSize = calculateBatchSize(columnCount);

  if (process.env.DEBUG) {
    console.log(
      `INSERT INTO ${table} (${columns.join(", ")}) - ${rows.length} rows (batch size: ${batchSize})`,
    );
  }

  // Process rows in batches
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const currentBatchSize = batch.length;

    // Get the appropriate prepared statement for this batch size
    const stmt = getBatchPreparedStatement(
      db,
      table,
      columns,
      currentBatchSize,
    );

    // Flatten all values for the batch into a single array
    const batchValues: any[] = [];
    for (const row of batch) {
      for (const col of columns) {
        const normalized = normalizeValue(row[col]);
        const t = typeof normalized;
        if (
          normalized !== null &&
          t !== "string" &&
          t !== "number" &&
          t !== "boolean" &&
          t !== "bigint" &&
          !(normalized instanceof Uint8Array)
        ) {
          const preview =
            normalized && typeof normalized === "object"
              ? JSON.stringify(normalized, null, 0)?.slice(0, 200)
              : String(normalized);
          throw new Error(
            `Invalid bind value for ${table}.${col} (type=${t}): ${preview}`,
          );
        }
        batchValues.push(normalized);
      }
    }

    // Execute the batch insert
    stmt.run(...batchValues);
  }
};

/**
 * Create a batching wrapper for insertRows that accumulates rows
 * and flushes them in larger batches for better performance.
 *
 * This is crucial for migrators that call insertRows with single rows.
 */
export const createBatchingInserter = (db: Database, flushSize = 500) => {
  const pendingInserts = new Map<string, any[]>();

  const flush = (table?: string) => {
    if (table) {
      const rows = pendingInserts.get(table);
      if (rows && rows.length > 0) {
        insertRows(db)(table, rows);
        pendingInserts.delete(table);
      }
    } else {
      // Flush all tables
      for (const [tbl, rows] of pendingInserts.entries()) {
        if (rows.length > 0) {
          insertRows(db)(tbl, rows);
        }
      }
      pendingInserts.clear();
    }
  };

  const batchedInsertRows = (table: string, rows: any[]) => {
    if (rows.length === 0) return;

    if (!pendingInserts.has(table)) {
      pendingInserts.set(table, []);
    }

    const pending = pendingInserts.get(table)!;
    pending.push(...rows);

    // Auto-flush when batch size is reached
    if (pending.length >= flushSize) {
      flush(table);
    }
  };

  return {
    insertRows: batchedInsertRows,
    flush,
    flushAll: () => flush(),
  };
};

export const parseDate = (date: string | null | undefined) => {
  if (!date) return null;
  return date.substring(0, 10);
};

export const parseDateTime = (date: string | null | undefined) => {
  if (!date) return null;
  return `${date.substring(0, 10)}T${date.substring(11)}`;
};

export const trimString = (value: string | null | undefined) => {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
};

export const parseYear = (year: string): number | null => {
  const parsed = parseInt(year, 10);
  if (Number.isNaN(parsed)) return null;
  return parsed;
};

import { getParsedRowStore, getRawRowStore } from "#storage/row-store/factory";
import type { ColumnSchema } from "#storage/row-store/types";

/**
 * Parsed row structure - normalized to object format
 */
type ParsedRow = Record<string, any>;

const IMPORT_METADATA_FIELDS = {
  sourceTable: "__sourceTable",
  sourcePage: "__sourcePage",
  scrapedAt: "__sourceScrapedAt",
  sourcePrimaryKeyName: "__sourcePrimaryKeyName",
  sourcePrimaryKeyValue: "__sourcePrimaryKeyValue",
} as const;

/**
 * Parser function type - transforms raw row data
 * @param row - Row data as object with column names as keys
 * @param primaryKey - Name of the primary key column
 * @returns Tuple of [identifier, parsedData]
 */
export type ParserFunction = (
  row: ParsedRow,
  primaryKey: string,
) => Promise<[identifier: string, data: ParsedRow]>;

/**
 * Optional lifecycle hooks that parser modules can export alongside their
 * default ParserFunction.
 */
export interface ParserHooks {
  onParsingComplete?: () => Promise<void>;
}

/**
 * Default parser - passes through data unchanged
 */
const defaultParser: ParserFunction = async (
  row: ParsedRow,
  primaryKey: string,
): Promise<[string, ParsedRow]> => {
  return [`${row[primaryKey]}`, row];
};

/**
 * Load a parser module for a table.
 * Returns the parse function and any lifecycle hooks the module exports.
 */
async function getParserModule(
  tableName: string,
): Promise<{ parse: ParserFunction; hooks: ParserHooks }> {
  try {
    const mod = await import(`./fn/${tableName}.ts`);
    return {
      parse: mod.default as ParserFunction,
      hooks: {
        onParsingComplete:
          typeof mod.onParsingComplete === "function"
            ? mod.onParsingComplete
            : undefined,
      },
    };
  } catch (_e) {
    console.warn(
      `⚠️  No custom parser found for ${tableName}, using default parser`,
    );
    return { parse: defaultParser, hooks: {} };
  }
}

/**
 * Convert raw API response row (array) to object with column names
 */
function rowArrayToObject(columnNames: string[], rowData: any[]): ParsedRow {
  const obj: ParsedRow = {};
  for (let i = 0; i < columnNames.length; i++) {
    obj[columnNames[i]] = rowData[i];
  }
  return obj;
}

/**
 * Parse options
 */
export interface ParseOptions {
  tableName: string;
  force?: boolean;
  pkStartValue?: number;
  pkEndValue?: number;
  onRowsUpserted?: (event: ParseRowsUpsertedEvent) => Promise<void> | void;
  onProgress?: (progress: {
    page: number;
    rowsParsed: number;
    totalPages: number;
    percentComplete: number;
  }) => void;
}

export interface ParseRowsUpsertedEvent {
  tableName: string;
  rowCount: number;
  pkStartValue: number;
  pkEndValue: number;
}

export interface ParseResult {
  rowsProcessed: number;
  rowsParsed: number;
  rowsSkipped: number;
}

/**
 * Parse a table from raw.db to parsed.db with hash-based skip.
 */
export async function parseTable(options: ParseOptions): Promise<ParseResult> {
  const {
    tableName,
    force = false,
    pkStartValue,
    pkEndValue,
    onRowsUpserted,
    onProgress,
  } = options;

  if (
    pkStartValue !== undefined &&
    (!Number.isInteger(pkStartValue) || pkStartValue < 0)
  ) {
    throw new Error("pkStartValue must be a non-negative integer");
  }
  if (
    pkEndValue !== undefined &&
    (!Number.isInteger(pkEndValue) || pkEndValue < 0)
  ) {
    throw new Error("pkEndValue must be a non-negative integer");
  }
  if (pkEndValue !== undefined && pkStartValue === undefined) {
    throw new Error("pkEndValue requires pkStartValue");
  }
  if (
    pkStartValue !== undefined &&
    pkEndValue !== undefined &&
    pkEndValue < pkStartValue
  ) {
    throw new Error("pkEndValue must be greater than or equal to pkStartValue");
  }

  const rawStore = getRawRowStore();
  const parsedStore = getParsedRowStore();

  console.log(`\n🔄 Parsing table: ${tableName}`);
  console.log(`📁 Raw store: ${rawStore.name}`);
  console.log(`📁 Parsed store: ${parsedStore.name}`);

  const { parse: parseData, hooks } = await getParserModule(tableName);

  const totalRawRows = await rawStore.count(tableName);

  if (totalRawRows === 0) {
    console.log(`⚠️  No raw data found for ${tableName}`);
    if (hooks.onParsingComplete) {
      await hooks.onParsingComplete();
    }
    return {
      rowsProcessed: 0,
      rowsParsed: 0,
      rowsSkipped: 0,
    };
  }

  console.log(`📋 Total raw rows: ${totalRawRows.toLocaleString()}`);
  if (pkStartValue !== undefined && pkEndValue !== undefined) {
    console.log(`🎯 PK range: [${pkStartValue}, ${pkEndValue}]`);
  } else if (pkStartValue !== undefined) {
    console.log(`🎯 PK range: [${pkStartValue}, ∞)`);
  }

  // Schema cache to avoid per-row DB lookups
  const schemaCache = new Map<string, ColumnSchema>();

  async function getSchema(columnHash: string): Promise<ColumnSchema | null> {
    if (schemaCache.has(columnHash)) return schemaCache.get(columnHash)!;
    const schema = await rawStore.getColumnSchema(columnHash);
    if (schema) schemaCache.set(columnHash, schema);
    return schema;
  }

  let rowsProcessed = 0;
  let rowsSkipped = 0;
  let rowsParsed = 0;
  const progressTotalRows =
    pkStartValue !== undefined && pkEndValue !== undefined
      ? Math.max(pkEndValue - pkStartValue + 1, 1)
      : Math.max(totalRawRows, 1);

  // Write buffer: accumulate rows and flush in batches
  const WRITE_BATCH = 500;
  const writeBuffer: Array<{
    pk: number;
    data: string;
    hash: string;
  }> = [];
  let pkNameForBatch = "";
  let columnNamesForBatch: string[] = [];

  async function flushBuffer(): Promise<void> {
    if (writeBuffer.length === 0) return;
    const pkStart = writeBuffer[0].pk;
    const pkEnd = writeBuffer[writeBuffer.length - 1].pk;
    const rowCount = writeBuffer.length;

    await parsedStore.upsertBatch(
      tableName,
      pkNameForBatch,
      columnNamesForBatch,
      writeBuffer,
    );

    if (onRowsUpserted) {
      await onRowsUpserted({
        tableName,
        rowCount,
        pkStartValue: pkStart,
        pkEndValue: pkEnd,
      });
    }

    writeBuffer.length = 0;
  }

  for await (const rawRow of rawStore.list(tableName)) {
    if (pkStartValue !== undefined && rawRow.pk < pkStartValue) {
      continue;
    }
    if (pkEndValue !== undefined && rawRow.pk > pkEndValue) {
      break;
    }

    rowsProcessed++;

    // Hash-based skip: if parsed row exists with same hash, skip re-parsing
    if (!force) {
      const existingParsed = await parsedStore.get(tableName, rawRow.pk);
      if (existingParsed && existingParsed.hash === rawRow.hash) {
        rowsSkipped++;

        if (rowsProcessed % 1000 === 0) {
          const percentComplete = Math.min(
            (rowsProcessed / progressTotalRows) * 100,
            100,
          );
          console.log(
            `📊 Progress: ${rowsProcessed.toLocaleString()} rows (${percentComplete.toFixed(1)}%) - ${rowsSkipped.toLocaleString()} skipped`,
          );
        }
        continue;
      }
    }

    const schema = await getSchema(rawRow.columnHash);
    if (!schema) {
      console.warn(
        `⚠️  No column schema found for hash ${rawRow.columnHash}, skipping PK ${rawRow.pk}`,
      );
      continue;
    }

    const values = JSON.parse(rawRow.data) as any[];
    const rowObject = rowArrayToObject(schema.columnNames, values);

    const [_identifier, parsedData] = await parseData(rowObject, schema.pkName);

    const parsedRow: ParsedRow = {
      ...parsedData,
      [IMPORT_METADATA_FIELDS.sourceTable]: tableName,
      [IMPORT_METADATA_FIELDS.sourcePage]: rawRow.pk,
      [IMPORT_METADATA_FIELDS.scrapedAt]: rawRow.updatedAt,
      [IMPORT_METADATA_FIELDS.sourcePrimaryKeyName]: schema.pkName,
      [IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue]:
        rowObject[schema.pkName] ?? null,
    };

    writeBuffer.push({
      pk: rawRow.pk,
      data: JSON.stringify(parsedRow),
      hash: rawRow.hash,
    });

    // Track pkName and columnNames for the upsertBatch call (parsed store ignores these)
    pkNameForBatch = schema.pkName;
    columnNamesForBatch = schema.columnNames;

    rowsParsed++;

    if (writeBuffer.length >= WRITE_BATCH) {
      await flushBuffer();
    }

    if (rowsProcessed % 1000 === 0) {
      const percentComplete = Math.min(
        (rowsProcessed / progressTotalRows) * 100,
        100,
      );
      console.log(
        `📊 Progress: ${rowsProcessed.toLocaleString()} rows (${percentComplete.toFixed(1)}%) - ${rowsParsed.toLocaleString()} parsed, ${rowsSkipped.toLocaleString()} skipped`,
      );

      if (onProgress) {
        onProgress({
          page: rowsProcessed,
          rowsParsed,
          totalPages: progressTotalRows,
          percentComplete,
        });
      }
    }
  }

  await flushBuffer();

  if (hooks.onParsingComplete) {
    await hooks.onParsingComplete();
  }

  console.log(`\n✅ Parsing complete for ${tableName}`);
  console.log(`📊 Total rows processed: ${rowsProcessed.toLocaleString()}`);
  console.log(`📊 Rows parsed (new/changed): ${rowsParsed.toLocaleString()}`);
  console.log(`📊 Rows skipped (unchanged): ${rowsSkipped.toLocaleString()}`);

  if (onProgress) {
    onProgress({
      page: rowsProcessed,
      rowsParsed,
      totalPages: progressTotalRows,
      percentComplete: 100,
    });
  }

  return {
    rowsProcessed,
    rowsParsed,
    rowsSkipped,
  };
}

/**
 * Parse multiple tables
 */
export async function parseTables(
  tableNames: string[],
  options?: Omit<ParseOptions, "tableName">,
): Promise<void> {
  for (const tableName of tableNames) {
    try {
      await parseTable({ ...options, tableName });
    } catch (error) {
      console.error(`❌ Error parsing ${tableName}:`, error);
      // Continue with next table
    }
  }
}

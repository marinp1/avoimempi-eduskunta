import {
  type DataStage,
  getStorage,
  listAllStorageKeys,
  StorageKeyBuilder,
} from "#storage";
import { getParsedRowStore, getRawRowStore } from "#storage/row-store/factory";
import type { ColumnSchema } from "#storage/row-store/types";

/**
 * Tables that continue to use the legacy file-based storage.
 * VaskiData has special parser hooks (onPageParsed, onParsingComplete) that
 * depend on file paths and build a local index for the VaskiData migrator.
 */
const LEGACY_FILE_STORAGE_TABLES = new Set(["VaskiData"]);

/**
 * API Response structure from storage (created by scraper, legacy path only)
 */
interface EduskuntaApiResponse {
  columnNames: string[];
  pkName: string;
  pkLastValue: number | null;
  rowData: any[][];
  rowCount: number;
  hasMore: boolean;
  source?: {
    tableName?: string;
    firstPk?: number;
    lastPk?: number;
    scrapedAt?: string;
  };
}

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
  onPageParsed?: (storageKey: string, rows: ParsedRow[]) => Promise<void>;
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
        onPageParsed:
          typeof mod.onPageParsed === "function" ? mod.onPageParsed : undefined,
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
  sourceStage?: DataStage;
  targetStage?: DataStage;
  force?: boolean;
  onProgress?: (progress: {
    page: number;
    rowsParsed: number;
    totalPages: number;
    percentComplete: number;
  }) => void;
}

/**
 * Parse a table from raw storage to parsed storage.
 * VaskiData is routed to the legacy file-based path.
 */
export async function parseTable(options: ParseOptions): Promise<void> {
  if (LEGACY_FILE_STORAGE_TABLES.has(options.tableName)) {
    return parseTableLegacyFileStorage(options);
  }
  return parseTableFromRowStore(options);
}

/**
 * DB-backed parser: reads from raw.db, writes to parsed.db with hash-based skip.
 */
async function parseTableFromRowStore(options: ParseOptions): Promise<void> {
  const { tableName, force = false, onProgress } = options;

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
    return;
  }

  console.log(`📋 Total raw rows: ${totalRawRows.toLocaleString()}`);

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
    await parsedStore.upsertBatch(
      tableName,
      pkNameForBatch,
      columnNamesForBatch,
      writeBuffer,
    );
    writeBuffer.length = 0;
  }

  for await (const rawRow of rawStore.list(tableName)) {
    rowsProcessed++;

    // Hash-based skip: if parsed row exists with same hash, skip re-parsing
    if (!force) {
      const existingParsed = await parsedStore.get(tableName, rawRow.pk);
      if (existingParsed && existingParsed.hash === rawRow.hash) {
        rowsSkipped++;

        if (rowsProcessed % 1000 === 0) {
          const percentComplete = (rowsProcessed / totalRawRows) * 100;
          console.log(
            `📊 Progress: ${rowsProcessed.toLocaleString()} / ${totalRawRows.toLocaleString()} rows (${percentComplete.toFixed(1)}%) - ${rowsSkipped.toLocaleString()} skipped`,
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
      [IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue]: rowObject[schema.pkName] ?? null,
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
      const percentComplete = (rowsProcessed / totalRawRows) * 100;
      console.log(
        `📊 Progress: ${rowsProcessed.toLocaleString()} / ${totalRawRows.toLocaleString()} rows (${percentComplete.toFixed(1)}%) - ${rowsParsed.toLocaleString()} parsed, ${rowsSkipped.toLocaleString()} skipped`,
      );

      if (onProgress) {
        onProgress({
          page: rowsProcessed,
          rowsParsed,
          totalPages: totalRawRows,
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
      totalPages: totalRawRows,
      percentComplete: 100,
    });
  }
}

/**
 * Legacy file-based parser for tables that require file storage (VaskiData).
 */
async function parseTableLegacyFileStorage(
  options: ParseOptions,
): Promise<void> {
  const {
    tableName,
    sourceStage = "raw",
    targetStage = "parsed",
    force = false,
    onProgress,
  } = options;

  const storage = getStorage();

  console.log(`\n🔄 Parsing table: ${tableName} (legacy file storage)`);
  console.log(`📁 Storage: ${storage.name}`);
  console.log(`📊 Source stage: ${sourceStage}`);
  console.log(`📊 Target stage: ${targetStage}`);

  const { parse: parseData, hooks } = await getParserModule(tableName);

  const prefix = StorageKeyBuilder.listPrefixForTable(sourceStage, tableName);
  const sourceKeys = await listAllStorageKeys(storage, {
    prefix,
    pageSize: 10_000,
  });

  if (sourceKeys.length === 0) {
    console.log(`⚠️  No data found for ${tableName} in ${sourceStage} stage`);
    return;
  }

  console.log(`📋 Found ${sourceKeys.length} pages to parse`);

  let pagesToParse: typeof sourceKeys;
  let alreadyParsedCount = 0;

  if (force) {
    console.log(`🔄 Force mode: re-parsing all ${sourceKeys.length} pages`);
    pagesToParse = sourceKeys;
  } else {
    const targetPrefix = StorageKeyBuilder.listPrefixForTable(
      targetStage,
      tableName,
    );
    const parsedKeys = await listAllStorageKeys(storage, {
      prefix: targetPrefix,
      pageSize: 10_000,
    });

    const parsedFilenames = new Set(
      parsedKeys.map((k) => k.key.split("/").pop()!),
    );

    const parsedRefs = parsedKeys
      .map((k) => StorageKeyBuilder.parseKey(k.key))
      .filter(
        (
          ref,
        ): ref is NonNullable<ReturnType<typeof StorageKeyBuilder.parseKey>> =>
          ref !== null,
      );

    if (parsedRefs.length > 0) {
      const lastParsedRef = parsedRefs.reduce((max, curr) =>
        curr.lastPk > max.lastPk ? curr : max,
      );
      const lastFilename = StorageKeyBuilder.forPkRange(
        targetStage,
        tableName,
        lastParsedRef.firstPk,
        lastParsedRef.lastPk,
      )
        .split("/")
        .pop()!;
      parsedFilenames.delete(lastFilename);
    }

    alreadyParsedCount = parsedFilenames.size;

    pagesToParse = sourceKeys.filter((key) => {
      const filename = key.key.split("/").pop()!;
      return !parsedFilenames.has(filename);
    });

    if (alreadyParsedCount > 0) {
      console.log(`✅ Already parsed: ${alreadyParsedCount} pages (complete)`);
      console.log(
        `🔄 Re-parsing last page and continuing: ${pagesToParse.length} pages remaining`,
      );
    } else if (pagesToParse.length === sourceKeys.length) {
      console.log(`🚀 Starting fresh: ${pagesToParse.length} pages to parse`);
    }

    if (pagesToParse.length === 0) {
      if (hooks.onParsingComplete) {
        await hooks.onParsingComplete();
      }
      console.log(`✅ All pages already parsed for ${tableName}`);
      return;
    }
  }

  console.log();

  const sortedPagesToParse = [...pagesToParse].sort((a, b) => {
    const ra = StorageKeyBuilder.parseKey(a.key);
    const rb = StorageKeyBuilder.parseKey(b.key);
    return (ra?.firstPk ?? 0) - (rb?.firstPk ?? 0);
  });

  const totalPages = sourceKeys.length;
  let pagesParsed = 0;
  let internalPageCounter = alreadyParsedCount + 1;
  let totalRowsParsed = 0;

  for (const keyMetadata of sortedPagesToParse) {
    const pageRef = StorageKeyBuilder.parseKey(keyMetadata.key);
    if (!pageRef) {
      console.warn(`⚠️  Could not parse key: ${keyMetadata.key}`);
      continue;
    }

    console.log(
      `📄 Processing page_${String(pageRef.firstPk).padStart(12, "0")}+${String(pageRef.lastPk).padStart(12, "0")}...`,
    );

    const rawData = await storage.get(keyMetadata.key);
    if (!rawData) {
      console.warn(`⚠️  Could not read ${keyMetadata.key}`);
      continue;
    }

    const apiResponse = JSON.parse(rawData) as EduskuntaApiResponse;
    const sourceTableName =
      typeof apiResponse.source?.tableName === "string" &&
      apiResponse.source.tableName.trim() !== ""
        ? apiResponse.source.tableName
        : tableName;
    const sourcePk =
      typeof apiResponse.source?.firstPk === "number" &&
      Number.isFinite(apiResponse.source.firstPk)
        ? apiResponse.source.firstPk
        : pageRef.firstPk;
    const sourceScrapedAt =
      typeof apiResponse.source?.scrapedAt === "string"
        ? apiResponse.source.scrapedAt
        : null;

    const parsedRows: ParsedRow[] = [];

    for (const rowData of apiResponse.rowData) {
      const rowObject = rowArrayToObject(apiResponse.columnNames, rowData);

      const [_identifier, parsedData] = await parseData(
        rowObject,
        apiResponse.pkName,
      );

      parsedRows.push({
        ...parsedData,
        [IMPORT_METADATA_FIELDS.sourceTable]: sourceTableName,
        [IMPORT_METADATA_FIELDS.sourcePage]: sourcePk,
        [IMPORT_METADATA_FIELDS.scrapedAt]: sourceScrapedAt,
        [IMPORT_METADATA_FIELDS.sourcePrimaryKeyName]: apiResponse.pkName,
        [IMPORT_METADATA_FIELDS.sourcePrimaryKeyValue]:
          rowObject[apiResponse.pkName] ?? null,
      });
      totalRowsParsed++;
    }

    const parsedPage = {
      columnNames: apiResponse.columnNames,
      pkName: apiResponse.pkName,
      pkLastValue: apiResponse.pkLastValue,
      rowData: parsedRows,
      rowCount: parsedRows.length,
      hasMore: apiResponse.hasMore,
      source: {
        tableName: sourceTableName,
        firstPk: sourcePk,
        lastPk: pageRef.lastPk,
        scrapedAt: sourceScrapedAt,
      },
    };

    const targetKey = StorageKeyBuilder.forPkRange(
      targetStage,
      tableName,
      pageRef.firstPk,
      pageRef.lastPk,
    );
    await storage.put(targetKey, JSON.stringify(parsedPage, null, 2));

    if (hooks.onPageParsed) {
      await hooks.onPageParsed(targetKey, parsedRows);
    }

    pagesParsed++;
    const totalPagesParsed = alreadyParsedCount + pagesParsed;
    const percentComplete = (totalPagesParsed / totalPages) * 100;

    console.log(
      `✅ Parsed page_${String(pageRef.firstPk).padStart(12, "0")}+${String(pageRef.lastPk).padStart(12, "0")} (${apiResponse.rowCount} rows) - ${percentComplete.toFixed(1)}% complete`,
    );

    if (onProgress) {
      onProgress({
        page: internalPageCounter,
        rowsParsed: totalRowsParsed,
        totalPages,
        percentComplete,
      });
    }

    internalPageCounter++;
  }

  if (hooks.onParsingComplete) {
    await hooks.onParsingComplete();
  }

  console.log(`\n✅ Parsing complete for ${tableName}`);
  console.log(`📊 Total pages parsed: ${pagesParsed}`);
  console.log(`📊 Total rows parsed: ${totalRowsParsed.toLocaleString()}`);
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

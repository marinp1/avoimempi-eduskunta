import {
  type DataStage,
  getStorage,
  listAllStorageKeys,
  StorageKeyBuilder,
} from "#storage";
import { recordSourceStagePage } from "#storage/source-status";

/**
 * API Response structure from storage (created by scraper)
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
 * Parse a table from raw storage to parsed storage
 */
export async function parseTable(options: ParseOptions): Promise<void> {
  const {
    tableName,
    sourceStage = "raw",
    targetStage = "parsed",
    force = false,
    onProgress,
  } = options;

  const storage = getStorage();

  console.log(`\n🔄 Parsing table: ${tableName}`);
  console.log(`📁 Storage: ${storage.name}`);
  console.log(`📊 Source stage: ${sourceStage}`);
  console.log(`📊 Target stage: ${targetStage}`);

  // Get parser function and hooks
  const { parse: parseData, hooks } = await getParserModule(tableName);

  // List all pages for this table (use high maxKeys to get all pages)
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
    // Check which pages are already parsed by matching filenames
    const targetPrefix = StorageKeyBuilder.listPrefixForTable(
      targetStage,
      tableName,
    );
    const parsedKeys = await listAllStorageKeys(storage, {
      prefix: targetPrefix,
      pageSize: 10_000,
    });

    // Build set of already-parsed filenames (e.g. "page_000000000001+000000000100.json")
    const parsedFilenames = new Set(
      parsedKeys.map((k) => k.key.split("/").pop()!),
    );

    // Find the last parsed file (highest lastPk) to re-parse it
    const parsedRefs = parsedKeys
      .map((k) => StorageKeyBuilder.parseKey(k.key))
      .filter((ref): ref is NonNullable<ReturnType<typeof StorageKeyBuilder.parseKey>> => ref !== null);

    if (parsedRefs.length > 0) {
      const lastParsedRef = parsedRefs.reduce((max, curr) =>
        curr.lastPk > max.lastPk ? curr : max,
      );
      const lastFilename = StorageKeyBuilder.forPkRange(
        targetStage,
        tableName,
        lastParsedRef.firstPk,
        lastParsedRef.lastPk,
      ).split("/").pop()!;
      parsedFilenames.delete(lastFilename);
    }

    alreadyParsedCount = parsedFilenames.size;

    pagesToParse = sourceKeys.filter((key) => {
      const filename = key.key.split("/").pop()!;
      return !parsedFilenames.has(filename);
    });

    if (alreadyParsedCount > 0) {
      console.log(
        `✅ Already parsed: ${alreadyParsedCount} pages (complete)`,
      );
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

  // Sort pages by firstPk ascending so we process in order
  const sortedPagesToParse = [...pagesToParse].sort((a, b) => {
    const ra = StorageKeyBuilder.parseKey(a.key);
    const rb = StorageKeyBuilder.parseKey(b.key);
    return (ra?.firstPk ?? 0) - (rb?.firstPk ?? 0);
  });

  const totalPages = sourceKeys.length;
  let pagesParsed = 0;
  let internalPageCounter = alreadyParsedCount + 1;
  let totalRowsParsed = 0;

  // Process each page
  for (const keyMetadata of sortedPagesToParse) {
    const pageRef = StorageKeyBuilder.parseKey(keyMetadata.key);
    if (!pageRef) {
      console.warn(`⚠️  Could not parse key: ${keyMetadata.key}`);
      continue;
    }

    console.log(`📄 Processing page_${String(pageRef.firstPk).padStart(12, "0")}+${String(pageRef.lastPk).padStart(12, "0")}...`);

    // Read raw page data
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

    // Parse each row in the page
    const parsedRows: ParsedRow[] = [];

    for (const rowData of apiResponse.rowData) {
      // Convert array to object
      const rowObject = rowArrayToObject(apiResponse.columnNames, rowData);

      // Apply parser
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

    // Create parsed page structure — same PK-range filename as source
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

    // Write parsed page using same PK-range key
    const targetKey = StorageKeyBuilder.forPkRange(
      targetStage,
      tableName,
      pageRef.firstPk,
      pageRef.lastPk,
    );
    await storage.put(targetKey, JSON.stringify(parsedPage, null, 2));
    await recordSourceStagePage(
      tableName,
      targetStage,
      internalPageCounter,
      parsedPage.rowCount,
    );

    // Call page hook if the parser module exports one
    if (hooks.onPageParsed) {
      await hooks.onPageParsed(targetKey, parsedRows);
    }

    pagesParsed++;
    const totalPagesParsed = alreadyParsedCount + pagesParsed;
    const percentComplete = (totalPagesParsed / totalPages) * 100;

    console.log(
      `✅ Parsed page_${String(pageRef.firstPk).padStart(12, "0")}+${String(pageRef.lastPk).padStart(12, "0")} (${apiResponse.rowCount} rows) - ${percentComplete.toFixed(1)}% complete`,
    );

    // Call progress callback
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

  // Call completion hook if the parser module exports one
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

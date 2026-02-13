import { type DataStage, getStorage, StorageKeyBuilder } from "#storage";

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
}

/**
 * Parsed row structure - normalized to object format
 */
type ParsedRow = Record<string, any>;

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
  onPageParsed?: (pageNumber: number, rows: ParsedRow[]) => Promise<void>;
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
        onPageParsed: typeof mod.onPageParsed === "function" ? mod.onPageParsed : undefined,
        onParsingComplete: typeof mod.onParsingComplete === "function" ? mod.onParsingComplete : undefined,
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
  const listResult = await storage.list({ prefix, maxKeys: 100000 });

  if (listResult.keys.length === 0) {
    console.log(`⚠️  No data found for ${tableName} in ${sourceStage} stage`);
    return;
  }

  console.log(`📋 Found ${listResult.keys.length} pages to parse`);

  let pagesToParse: typeof listResult.keys;
  let alreadyParsedPages = new Set<number>();

  if (force) {
    console.log(
      `🔄 Force mode: re-parsing all ${listResult.keys.length} pages`,
    );
    pagesToParse = listResult.keys;
  } else {
    // Check which pages are already parsed
    const targetPrefix = StorageKeyBuilder.listPrefixForTable(
      targetStage,
      tableName,
    );
    const targetListResult = await storage.list({
      prefix: targetPrefix,
      maxKeys: 100000,
    });

    alreadyParsedPages = new Set(
      targetListResult.keys
        .map((key) => StorageKeyBuilder.parseKey(key.key))
        .filter((ref) => ref !== null)
        .map((ref) => ref?.page),
    );

    // Always re-parse the last page in case it was incomplete
    const lastParsedPage =
      alreadyParsedPages.size > 0 ? Math.max(...alreadyParsedPages) : 0;
    if (lastParsedPage > 0) {
      alreadyParsedPages.delete(lastParsedPage);
    }

    pagesToParse = listResult.keys.filter((key) => {
      const pageRef = StorageKeyBuilder.parseKey(key.key);
      return pageRef && !alreadyParsedPages.has(pageRef.page);
    });

    if (alreadyParsedPages.size > 0) {
      console.log(
        `✅ Already parsed: ${alreadyParsedPages.size} pages (complete)`,
      );
      console.log(
        `🔄 Re-parsing last page and continuing: ${pagesToParse.length} pages remaining`,
      );
    } else if (pagesToParse.length === listResult.keys.length) {
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

  const totalPages = listResult.keys.length;
  let pagesParsed = 0;
  let totalRowsParsed = 0;

  // Process each page
  for (const keyMetadata of pagesToParse) {
    const pageRef = StorageKeyBuilder.parseKey(keyMetadata.key);
    if (!pageRef) {
      console.warn(`⚠️  Could not parse key: ${keyMetadata.key}`);
      continue;
    }

    console.log(`📄 Processing page ${pageRef.page}...`);

    // Read raw page data
    const rawData = await storage.get(keyMetadata.key);
    if (!rawData) {
      console.warn(`⚠️  Could not read page ${pageRef.page}`);
      continue;
    }

    const apiResponse = JSON.parse(rawData) as EduskuntaApiResponse;

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

      parsedRows.push(parsedData);
      totalRowsParsed++;
    }

    // Create parsed page structure
    const parsedPage = {
      columnNames: apiResponse.columnNames,
      pkName: apiResponse.pkName,
      pkLastValue: apiResponse.pkLastValue,
      rowData: parsedRows,
      rowCount: parsedRows.length,
      hasMore: apiResponse.hasMore,
    };

    // Write parsed page to storage
    const targetKey = StorageKeyBuilder.forPage(
      targetStage,
      tableName,
      pageRef.page,
    );
    await storage.put(targetKey, JSON.stringify(parsedPage, null, 2));

    // Call page hook if the parser module exports one
    if (hooks.onPageParsed) {
      await hooks.onPageParsed(pageRef.page, parsedRows);
    }

    pagesParsed++;
    const totalPagesParsed = alreadyParsedPages.size + pagesParsed;
    const percentComplete = (totalPagesParsed / totalPages) * 100;

    console.log(
      `✅ Parsed page ${pageRef.page} (${apiResponse.rowCount} rows) - ${percentComplete.toFixed(1)}% complete`,
    );

    // Call progress callback
    if (onProgress) {
      onProgress({
        page: pageRef.page,
        rowsParsed: totalRowsParsed,
        totalPages,
        percentComplete,
      });
    }
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

import { getStorage, StorageKeyBuilder, type DataStage } from "#storage";

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
  primaryKey: string
) => Promise<[identifier: string, data: ParsedRow]>;

/**
 * Default parser - passes through data unchanged
 */
const defaultParser: ParserFunction = async (
  row: ParsedRow,
  primaryKey: string
): Promise<[string, ParsedRow]> => {
  return [`${row[primaryKey]}`, row];
};

/**
 * Get parser function for a table
 * Tries to load custom parser from fn/{tableName}.ts, falls back to default
 */
async function getParser(tableName: string): Promise<ParserFunction> {
  try {
    const module = await import(`./fn/${tableName}.ts`);
    return module.default as ParserFunction;
  } catch (e) {
    console.warn(`⚠️  No custom parser found for ${tableName}, using default parser`);
    return defaultParser;
  }
}

/**
 * Convert raw API response row (array) to object with column names
 */
function rowArrayToObject(
  columnNames: string[],
  rowData: any[]
): ParsedRow {
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
    onProgress,
  } = options;

  const storage = getStorage();

  console.log(`\n🔄 Parsing table: ${tableName}`);
  console.log(`📁 Storage: ${storage.name}`);
  console.log(`📊 Source stage: ${sourceStage}`);
  console.log(`📊 Target stage: ${targetStage}`);

  // Get parser function
  const parseData = await getParser(tableName);

  // List all pages for this table (use high maxKeys to get all pages)
  const prefix = StorageKeyBuilder.listPrefixForTable(sourceStage, tableName);
  const listResult = await storage.list({ prefix, maxKeys: 100000 });

  if (listResult.keys.length === 0) {
    console.log(`⚠️  No data found for ${tableName} in ${sourceStage} stage`);
    return;
  }

  console.log(`📋 Found ${listResult.keys.length} pages to parse`);
  console.log();

  const totalPages = listResult.keys.length;
  let pagesParsed = 0;
  let totalRowsParsed = 0;

  // Process each page
  for (const keyMetadata of listResult.keys) {
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
      const [identifier, parsedData] = await parseData(
        rowObject,
        apiResponse.pkName
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
      pageRef.page
    );
    await storage.put(targetKey, JSON.stringify(parsedPage, null, 2));

    pagesParsed++;
    const percentComplete = (pagesParsed / totalPages) * 100;

    console.log(
      `✅ Parsed page ${pageRef.page} (${apiResponse.rowCount} rows) - ${percentComplete.toFixed(1)}% complete`
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

  console.log(`\n✅ Parsing complete for ${tableName}`);
  console.log(`📊 Total pages parsed: ${pagesParsed}`);
  console.log(`📊 Total rows parsed: ${totalRowsParsed.toLocaleString()}`);
}

/**
 * Parse multiple tables
 */
export async function parseTables(
  tableNames: string[],
  options?: Omit<ParseOptions, "tableName">
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

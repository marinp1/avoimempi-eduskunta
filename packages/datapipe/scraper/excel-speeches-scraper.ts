/**
 * Excel Speeches Scraper
 *
 * Extracts speeches from Excel files in the raw data folder and converts them
 * to the standard parsed storage format.
 *
 * Unlike the standard scraper which fetches from the Eduskunta API, this scraper
 * reads Excel files that have been manually placed in data/raw/ExcelSpeeches/
 * and converts them to parsed JSON format.
 */
import * as XLSX from "xlsx";
import path from "path";
import { getStorage, StorageKeyBuilder } from "#storage";
import type { DataStage } from "#storage";
import { getProjectRoot } from "#constants";

type ExcelSpeech = {
  käsittelyvaihe?: string;
  Käsittelyvaihe?: string;
  vireilletuloasia?: string;
  Vireilletuloasia?: string;
  Vireilletuloasiakirja?: string;
  järjestys?: number;
  Järjestys?: number;
  id?: number;
  ID?: number;
  asema?: string;
  Asema?: string;
  etunimi?: string;
  Etunimi?: string;
  sukunimi?: string;
  Sukunimi?: string;
  eduskuntaryhmä?: string;
  Eduskuntaryhmä?: string;
  puheenvuorotyyppi?: string;
  Puheenvuorotyyppi?: string;
  aloitusajankohta?: number;
  Aloitusajankohta?: number;
  lopetusajankohta?: number;
  Lopetusajankohta?: number;
  puheenvuoro?: string;
  Puheenvuoro?: string;
  "pöytäkirjan verkko-osoite"?: string;
  "Pöytäkirjan verkko-osoite"?: string;
};

type ParsedSpeech = {
  processing_phase: string;
  document: string;
  order: number;
  id: number;
  position: string;
  first_name: string;
  last_name: string;
  party: string;
  speech_type: string;
  start_time: string;
  end_time: string;
  content: string;
  minutes_url: string;
  source_file: string;
};

/**
 * Convert Excel serial date to ISO string
 */
function excelDateToISO(serial: number): string {
  try {
    // Validate input
    if (typeof serial !== "number" || isNaN(serial) || serial <= 0) {
      return "";
    }

    // Excel dates are days since 1900-01-01 (with a known bug for 1900-02-29)
    const excelEpoch = new Date(1899, 11, 30); // December 30, 1899
    const days = Math.floor(serial);
    const fractionalDay = serial - days;
    const milliseconds = Math.round(fractionalDay * 24 * 60 * 60 * 1000);

    const date = new Date(
      excelEpoch.getTime() + days * 24 * 60 * 60 * 1000 + milliseconds,
    );

    // Validate resulting date
    if (isNaN(date.getTime())) {
      return "";
    }

    return date.toISOString();
  } catch (error) {
    return "";
  }
}

/**
 * Normalize column name (handle both lowercase and capitalized versions)
 */
function getValue(row: ExcelSpeech, ...keys: string[]): any {
  for (const key of keys) {
    if (row[key as keyof ExcelSpeech] !== undefined) {
      return row[key as keyof ExcelSpeech];
    }
  }
  return null;
}

/**
 * Parse a single Excel row to our format
 */
function parseSpeechRow(
  row: ExcelSpeech,
  sourceFile: string,
): ParsedSpeech | null {
  try {
    const id = getValue(row, "id", "ID");
    if (!id) return null;

    const startTime = getValue(row, "aloitusajankohta", "Aloitusajankohta");
    const endTime = getValue(row, "lopetusajankohta", "Lopetusajankohta");

    return {
      processing_phase: getValue(row, "käsittelyvaihe", "Käsittelyvaihe") || "",
      document:
        getValue(
          row,
          "vireilletuloasia",
          "Vireilletuloasia",
          "Vireilletuloasiakirja",
        ) || "",
      order: getValue(row, "järjestys", "Järjestys") || 0,
      id: Number(id),
      position: getValue(row, "asema", "Asema") || "",
      first_name: getValue(row, "etunimi", "Etunimi") || "",
      last_name: getValue(row, "sukunimi", "Sukunimi") || "",
      party: getValue(row, "eduskuntaryhmä", "Eduskuntaryhmä") || "",
      speech_type:
        getValue(row, "puheenvuorotyyppi", "Puheenvuorotyyppi") || "",
      start_time: startTime ? excelDateToISO(startTime) : "",
      end_time: endTime ? excelDateToISO(endTime) : "",
      content: getValue(row, "puheenvuoro", "Puheenvuoro") || "",
      minutes_url:
        getValue(
          row,
          "pöytäkirjan verkko-osoite",
          "Pöytäkirjan verkko-osoite",
        ) || "",
      source_file: sourceFile,
    };
  } catch (error) {
    console.error(`Error parsing row:`, error);
    return null;
  }
}

/**
 * Options for scraping Excel speeches
 */
export interface ScrapeExcelSpeechesOptions {
  onProgress?: (progress: {
    file: string;
    fileNumber: number;
    totalFiles: number;
    rowsExtracted: number;
    totalRowsExtracted: number;
  }) => void;
  outputStage?: DataStage;
}

/**
 * Get all Excel files from the raw ExcelSpeeches folder
 */
async function getExcelFiles(): Promise<string[]> {
  const storage = getStorage();
  const prefix = StorageKeyBuilder.listPrefixForTable("raw", "ExcelSpeeches");

  try {
    const result = await storage.list({ prefix });

    // Filter for Excel files
    const excelFiles = result.keys
      .map((item) => item.key)
      .filter((key) => key.endsWith(".xlsx") || key.endsWith(".xls"))
      .map((key) => {
        // Extract just the filename from the full key
        // Key format: data/raw/ExcelSpeeches/filename.xlsx
        const parts = key.split("/");
        return parts[parts.length - 1];
      });

    return excelFiles;
  } catch (error) {
    console.error("Error listing Excel files:", error);
    return [];
  }
}

/**
 * Get the full path to an Excel file
 */
function getExcelFilePath(filename: string): string {
  // Assuming the raw data is in a standard location relative to the project root
  return path.resolve(getProjectRoot(), "data/raw/ExcelSpeeches", filename);
}

/**
 * Scrape Excel speeches from all Excel files in the raw data folder
 *
 * This function:
 * 1. Lists all .xlsx files in data/raw/ExcelSpeeches/
 * 2. Reads each Excel file and extracts the "Puheenvuorot" sheet
 * 3. Parses and transforms the data
 * 4. Saves to data/parsed/ExcelSpeeches/ in paginated format (1000 rows per file)
 */
export async function scrapeExcelSpeeches(
  options: ScrapeExcelSpeechesOptions = {},
): Promise<void> {
  const { onProgress, outputStage = "parsed" } = options;

  console.log("🎙️  Starting Excel speeches extraction...\n");

  const storage = getStorage();
  const tableName = "ExcelSpeeches";

  // Get all Excel files
  const files = await getExcelFiles();

  if (files.length === 0) {
    console.log("⚠️  No Excel files found in data/raw/ExcelSpeeches/");
    console.log("   Please place Excel files (.xlsx) in that directory first.");
    return;
  }

  console.log(`📁 Found ${files.length} Excel file(s):\n`);
  files.forEach((file) => console.log(`   - ${file}`));
  console.log();

  let totalExtracted = 0;
  let totalSaved = 0;
  let globalPageNumber = 1;

  for (let fileIndex = 0; fileIndex < files.length; fileIndex++) {
    const file = files[fileIndex];
    const filePath = getExcelFilePath(file);

    console.log(`📁 Processing (${fileIndex + 1}/${files.length}): ${file}`);

    try {
      const workbook = XLSX.readFile(filePath);

      if (!workbook.SheetNames.includes("Puheenvuorot")) {
        console.log(`   ⚠️  No "Puheenvuorot" sheet found, skipping\n`);
        continue;
      }

      const sheet = workbook.Sheets["Puheenvuorot"];
      const rows = XLSX.utils.sheet_to_json<ExcelSpeech>(sheet);

      console.log(`   Found ${rows.length} rows`);

      // Parse rows
      const parsedSpeeches: ParsedSpeech[] = [];
      for (const row of rows) {
        const parsed = parseSpeechRow(row, file);
        if (parsed) {
          parsedSpeeches.push(parsed);
          totalExtracted++;
        }
      }

      // Save in chunks (1000 rows per file, similar to API pagination)
      const chunkSize = 1000;
      const chunks = Math.ceil(parsedSpeeches.length / chunkSize);

      for (let i = 0; i < chunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, parsedSpeeches.length);
        const chunk = parsedSpeeches.slice(start, end);

        const key = StorageKeyBuilder.forPage(
          outputStage,
          tableName,
          globalPageNumber,
        );
        const data = {
          rowData: chunk,
          pageNumber: globalPageNumber,
          totalRows: chunk.length,
          sourceFile: file,
        };

        await storage.put(key, JSON.stringify(data, null, 2));
        totalSaved += chunk.length;
        globalPageNumber++;
      }

      console.log(
        `   ✅ Extracted ${parsedSpeeches.length} speeches (${chunks} page(s))\n`,
      );

      // Call progress callback
      if (onProgress) {
        onProgress({
          file,
          fileNumber: fileIndex + 1,
          totalFiles: files.length,
          rowsExtracted: parsedSpeeches.length,
          totalRowsExtracted: totalExtracted,
        });
      }
    } catch (error: any) {
      console.error(`   ❌ Error processing file: ${error.message}\n`);
    }
  }

  console.log(`\n✅ Extraction complete!`);
  console.log(
    `   Total speeches extracted: ${totalExtracted.toLocaleString()}`,
  );
  console.log(`   Total speeches saved: ${totalSaved.toLocaleString()}`);
  console.log(`   Total pages created: ${globalPageNumber - 1}`);
  console.log(`   Storage location: data/${outputStage}/${tableName}/`);
}

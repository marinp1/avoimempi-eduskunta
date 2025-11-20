import type { Database } from "bun:sqlite";
import { insertRows } from "../utils";

/**
 * Migrator for ExcelSpeeches table
 *
 * Maps parsed Excel speech data to the ExcelSpeech database table.
 * The parsed data comes from Excel files containing parliamentary speeches.
 *
 * Handles duplicate excel_id values by appending an index suffix (_2, _3, etc.)
 * when the same person gives multiple speeches on the same day/document/phase.
 */

/**
 * Generate a base composite excel_id from the speech data
 * Format: YYYYMMDD_<document>_<processing_phase>_<person_id>_<order>
 */
function generateBaseExcelId(
  startTime: string,
  order: number,
  personId: number,
): string {
  // Extract YYYYMMDD from ISO timestamp (e.g., "2021-05-14T16:26:04.000Z")
  const timeMatch = startTime.match(/^(\d{4})-(\d{2})-(\d{2})T/);
  const yyyymmdd = timeMatch
    ? `${timeMatch[1]}${timeMatch[2]}${timeMatch[3]}`
    : "00000000";
  const excelKey = [yyyymmdd, String(personId), String(order)]
    .map((s) => s.toLowerCase().replace(/[^0-9a-z]/g, ""))
    .join("_");
  return excelKey;
}

export default (db: Database) => {
  // Closure to track seen excel_id values and their occurrence count
  const excelIdCounts = new Map<string, number>();

  return async (dataToImport: {
    id: number;
    processing_phase: string;
    document: string;
    order: number;
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
  }) => {
    // Generate base excel_id
    const baseExcelId = generateBaseExcelId(
      dataToImport.start_time,
      dataToImport.order,
      dataToImport.id,
    );

    // Check if we've seen this excel_id before
    const currentCount = excelIdCounts.get(baseExcelId) || 0;
    const newCount = currentCount + 1;
    excelIdCounts.set(baseExcelId, newCount);

    // If this is a duplicate, append the index suffix
    const finalExcelId =
      newCount === 1 ? baseExcelId : `${baseExcelId}_${newCount}`;

    const excelSpeechRow: DatabaseTables.ExcelSpeech = {
      excel_id: finalExcelId,
      processing_phase: dataToImport.processing_phase || null,
      document: dataToImport.document || null,
      ordinal: dataToImport.order || 0,
      position: dataToImport.position || null,
      first_name: dataToImport.first_name || null,
      last_name: dataToImport.last_name || null,
      party: dataToImport.party || null,
      speech_type: dataToImport.speech_type || null,
      start_time: dataToImport.start_time || null,
      end_time: dataToImport.end_time || null,
      content: dataToImport.content || null,
      minutes_url: dataToImport.minutes_url || null,
      source_file: dataToImport.source_file || null,
    };

    insertRows(db)("ExcelSpeech", [excelSpeechRow]);
  };
};

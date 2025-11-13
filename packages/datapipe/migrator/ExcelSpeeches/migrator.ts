import { type Database } from "bun:sqlite";
import { insertRows } from "../utils";

/**
 * Migrator for ExcelSpeeches table
 *
 * Maps parsed Excel speech data to the ExcelSpeech database table.
 * The parsed data comes from Excel files containing parliamentary speeches.
 */
/**
 * Generate a composite excel_id from the speech data
 * Format: YYYYMMDDHHmmss_<document>_<processing_phase>_<order>_<person_id>
 */
function generateExcelId(
  startTime: string,
  document: string,
  processingPhase: string,
  order: number,
  personId: number,
): string {
  // Extract YYYYMMDDHHmmss from ISO timestamp (e.g., "2021-05-14T16:26:04.000Z")
  const timeMatch = startTime.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})/,
  );
  const yyyymmddhhmmss = timeMatch
    ? `${timeMatch[1]}${timeMatch[2]}${timeMatch[3]}${timeMatch[4]}${timeMatch[5]}${timeMatch[6]}`
    : "00000000000000";

  // Sanitize document and processing_phase for use in ID (replace spaces and special chars)
  const sanitizedDoc = (document || "").replace(/[^a-zA-Z0-9]/g, "_");
  const sanitizedPhase = (processingPhase || "").replace(/[^a-zA-Z0-9]/g, "_");

  return `${yyyymmddhhmmss}_${sanitizedDoc}_${sanitizedPhase}_${order}_${personId}`;
}

export default (db: Database) =>
  async (dataToImport: {
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
    const excelSpeechRow: DatabaseTables.ExcelSpeech = {
      excel_id: generateExcelId(
        dataToImport.start_time,
        dataToImport.document,
        dataToImport.processing_phase,
        dataToImport.order,
        dataToImport.id,
      ),
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

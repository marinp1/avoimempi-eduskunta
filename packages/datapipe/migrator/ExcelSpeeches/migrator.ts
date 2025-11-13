import { type Database } from "bun:sqlite";
import { insertRows } from "../utils";

/**
 * Migrator for ExcelSpeeches table
 *
 * Maps parsed Excel speech data to the ExcelSpeech database table.
 * The parsed data comes from Excel files containing parliamentary speeches.
 */
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
      id: dataToImport.id,
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

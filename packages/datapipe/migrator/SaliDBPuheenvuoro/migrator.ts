import { type Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

/**
 * Generate excel_key for linking to ExcelSpeech table
 * Format: YYYYMMDDHHmmss_<agenda_key>_<processing_title>_<ordinal_number>_<person_id>
 */
function generateExcelKey(
  db: Database,
  ordinal: number,
  sectionKey: string,
  ordinalNumber: number,
  personId: number,
): string | null {
  try {
    // Extract YYYYMMDD from ordinal (format: YYYYMMDDHHmmss)
    const ordinalStr = String(ordinal);
    const yyyymmdd = ordinalStr.substring(0, 8);

    // Fetch Section data
    const section = db
      .query<
        { agenda_key: string | null; processing_title: string | null },
        [string]
      >("SELECT agenda_key, processing_title FROM Section WHERE key = ?")
      .get(sectionKey);

    if (!section || !section.agenda_key) {
      return null;
    }

    // Sanitize agenda_key and processing_title for use in ID
    const sanitizedAgenda = (section.agenda_key || "").replace(
      /[^a-zA-Z0-9]/g,
      "_",
    );
    const sanitizedTitle = (section.processing_title || "").replace(
      /[^a-zA-Z0-9]/g,
      "_",
    );

    return `${yyyymmdd}_${sanitizedAgenda}_${sanitizedTitle}_${ordinalNumber}_${personId}`;
  } catch (error) {
    console.error("Error generating excel_key:", error);
    return null;
  }
}

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBPuheenvuoro"]) => {
    const ordinal = +dataToImport.Jarjestys.substring(0, 19).replace(
      /[-:\s]/g,
      "",
    );
    const sectionKey = dataToImport.KohtaTekninenAvain;
    const ordinalNumber = +dataToImport.JarjestysNro;

    const speechRow: DatabaseTables.Speech = {
      id: +dataToImport.Id,
      key: dataToImport.TekninenAvain,
      session_key: dataToImport.IstuntoTekninenAvain,
      section_key: sectionKey,
      ordinal: ordinal,
      ordinal_number: ordinalNumber,
      speech_type: dataToImport.PVTyyppi,
      request_method: dataToImport.PyyntoTapa,
      request_time: parseDateTime(dataToImport.PyyntoAika),
      person_id: +dataToImport.henkilonumero,
      first_name: dataToImport.Etunimi,
      last_name: dataToImport.Sukunimi,
      gender: dataToImport.Sukupuoli,
      party_abbreviation: dataToImport.RyhmaLyhenneFI,
      has_spoken: !!+dataToImport.Puhunut,
      ministry: dataToImport.MinisteriysFI,
      modified_datetime: parseDateTime(dataToImport.Modified),
      excel_key: generateExcelKey(
        db,
        ordinal,
        sectionKey,
        ordinalNumber,
        +dataToImport.henkilonumero,
      ),
    };
    insertRows(db)("Speech", [speechRow]);
  };

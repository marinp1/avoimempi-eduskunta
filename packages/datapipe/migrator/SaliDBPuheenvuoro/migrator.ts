import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) => {
  // Closure to track seen excel_key values and their occurrence count
  const excelKeyCounts = new Map<string, number>();

  return async (dataToImport: RawDataModels["SaliDBPuheenvuoro"]) => {
    const ordinal = +dataToImport.Jarjestys.substring(0, 19).replace(
      /[-:\s]/g,
      "",
    );
    const sectionKey = dataToImport.KohtaTekninenAvain;
    const ordinalNumber = +dataToImport.JarjestysNro;

    const baseExcelKey = [
      String(ordinal).substring(0, 8),
      dataToImport.henkilonumero,
    ]
      .map((s) => s.toLowerCase().replace(/[^0-9a-z]/g, ""))
      .join("_");

    // Check if we've seen this excel_key before
    const currentCount = excelKeyCounts.get(baseExcelKey) || 0;
    const newCount = currentCount + 1;
    excelKeyCounts.set(baseExcelKey, newCount);

    // If this is a duplicate, append the index suffix
    const finalExcelKey =
      newCount === 1 ? baseExcelKey : `${baseExcelKey}_${newCount}`;

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
      party_abbreviation: dataToImport.RyhmaLyhenneFI?.toLowerCase() || null,
      has_spoken: !!+dataToImport.Puhunut,
      ministry: dataToImport.MinisteriysFI || null,
      modified_datetime: parseDateTime(dataToImport.Modified),
      excel_key: finalExcelKey,
      created_datetime: parseDateTime(dataToImport.Created),
      imported_datetime: parseDateTime(dataToImport.Imported),
      ad_tunnus: dataToImport.ADtunnus || null,
      order_raw: dataToImport.Jarjestys || null,
    };
    insertRows(db)("Speech", [speechRow]);
  };
};

import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) => {
  return async (dataToImport: RawDataModels["SaliDBPuheenvuoro"]) => {
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
      party_abbreviation: dataToImport.RyhmaLyhenneFI?.toLowerCase() || null,
      has_spoken: !!+dataToImport.Puhunut,
      ministry: dataToImport.MinisteriysFI || null,
      modified_datetime: parseDateTime(dataToImport.Modified),
      created_datetime: parseDateTime(dataToImport.Created),
      imported_datetime: parseDateTime(dataToImport.Imported),
      ad_tunnus: dataToImport.ADtunnus || null,
      order_raw: dataToImport.Jarjestys || null,
    };
    insertRows(db)("Speech", [speechRow]);
  };
};

import { type Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBPuheenvuoro"]) => {
    const speechRow: DatabaseTables.Speech = {
      id: +dataToImport.Id,
      key: dataToImport.TekninenAvain,
      session_key: dataToImport.IstuntoTekninenAvain,
      section_key: dataToImport.KohtaTekninenAvain,
      ordinal: +dataToImport.Jarjestys.substring(0, 19).replace(/[-:\s]/g, ""),
      ordinal_number: +dataToImport.JarjestysNro,
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
    };
    insertRows(db)("Speech", [speechRow]);
  };

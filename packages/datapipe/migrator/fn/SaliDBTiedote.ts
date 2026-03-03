import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBTiedote"]) => {
    const row: DatabaseTables.SessionNotice = {
      id: +dataToImport.Id,
      key: dataToImport.TekninenAvain || null,
      session_key: dataToImport.IstuntoTekninenAvain,
      section_key: dataToImport.KohtaTekninenAvain || null,
      notice_type: dataToImport.TiedoteTyyppi || null,
      text_fi: dataToImport.TiedoteTekstiFI || null,
      valid_until: parseDateTime(dataToImport.TiedoteVoimassaolo),
      sent_at: parseDateTime(dataToImport.TiedoteLahetetty),
      created_datetime: parseDateTime(dataToImport.Created),
      modified_datetime: parseDateTime(dataToImport.Modified),
      imported_datetime: parseDateTime(dataToImport.Imported),
    };

    insertRows(db)("SessionNotice", [row]);
  };

import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBKohta"]) => {
    const sectionRow: DatabaseTables.Section = {
      id: +dataToImport.Id,
      identifier: dataToImport.Tunniste,
      key: dataToImport.TekninenAvain,
      note: dataToImport.HuomautusFI || null,
      ordinal: +dataToImport.Jarjestysnumero,
      processing_title: dataToImport.KasittelyotsikkoFI || null,
      title: dataToImport.OtsikkoFI,
      resolution: dataToImport.PaatosFI || null,
      agenda_key: dataToImport.PJKohtaTunnus,
      session_key: dataToImport.IstuntoTekninenAvain,
      vaski_id: +dataToImport.VaskiID,
      modified_datetime: parseDateTime(dataToImport.Modified),
      default_speech_type: dataToImport.PuheenvuoroTyyppiOletus || null,
      can_request_speech: !!+dataToImport.VoikoPyytaaPV,
      created_datetime: parseDateTime(dataToImport.Created),
      imported_datetime: parseDateTime(dataToImport.Imported),
    };
    insertRows(db)("Section", [sectionRow]);
  };

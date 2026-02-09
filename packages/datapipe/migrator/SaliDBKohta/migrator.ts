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
    };
    insertRows(db)("Section", [sectionRow]);
  };

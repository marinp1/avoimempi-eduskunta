import { type Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBKohta"]) => {
    const sectionRow: DatabaseTables.Section = {
      id: +dataToImport.Id,
      identifier: dataToImport.Tunniste,
      key: dataToImport.TekninenAvain,
      note: dataToImport.HuomautusFI,
      ordinal: +dataToImport.Jarjestysnumero,
      processing_title: dataToImport.KasittelyotsikkoFI,
      title: dataToImport.OtsikkoFI,
      resolution: dataToImport.PaatosFI,
      agenda_key: dataToImport.PJKohtaTunnus,
      session_key: dataToImport.IstuntoTekninenAvain,
      vaski_id: +dataToImport.VaskiID,
      modified_datetime: parseDateTime(dataToImport.Modified),
    };
    insertRows(db)("Section", [sectionRow]);
  };

import { type Database } from "bun:sqlite";

import {
  insertRows,
  parseDate,
  parseDateTime,
  parseYear,
} from "../utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBIstunto"]) => {
    const sessionRow: DatabaseTables.Session = {
      id: +dataToImport.Id,
      number: +dataToImport.IstuntoNumero,
      key: dataToImport.TekninenAvain,
      date: parseDate(dataToImport.IstuntoPvm),
      year: parseYear(dataToImport.IstuntoVPVuosi),
      type: dataToImport.IstuntoTyyppi,
      state: dataToImport.IstuntoTila,
      description: dataToImport.IstuntoTilaSeliteFI?.trim(),
      start_time_actual: parseDate(dataToImport.IstuntoAlkuaika),
      start_time_reported: parseDate(dataToImport.IstuntoIlmoitettuAlkuaika),
      article_key: dataToImport.KasiteltavaKohtaTekninenAvain,
      speaker_id: +dataToImport.PuhujaHenkilonumero,
      modified_datetime: parseDateTime(dataToImport.Modified),
      agenda_key: dataToImport.PJTekninenAvain,
    };

    const agendaRow = {
      key: dataToImport.PJTekninenAvain,
      title: dataToImport.PJOtsikkoFI,
      state: dataToImport.PJTila,
    };

    insertRows(db)("Agenda", [agendaRow]);
    insertRows(db)("Session", [sessionRow]);
  };

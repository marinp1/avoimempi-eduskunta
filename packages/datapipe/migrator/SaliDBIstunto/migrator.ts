import type { Database } from "bun:sqlite";

import { insertRows, parseDate, parseDateTime, parseYear } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBIstunto"]) => {
    const sessionDateSource =
      dataToImport.IstuntoIlmoitettuAlkuaika ||
      dataToImport.IstuntoAlkuaika ||
      dataToImport.IstuntoPvm;

    const sessionRow: DatabaseTables.Session = {
      id: +dataToImport.Id,
      number: +dataToImport.IstuntoNumero,
      key: dataToImport.TekninenAvain,
      date: parseDate(sessionDateSource),
      year: parseYear(dataToImport.IstuntoVPVuosi),
      type: dataToImport.IstuntoTyyppi,
      state: dataToImport.IstuntoTila,
      description: dataToImport.IstuntoTilaSeliteFI?.trim(),
      start_time_actual: parseDate(dataToImport.IstuntoAlkuaika),
      start_time_reported: parseDate(dataToImport.IstuntoIlmoitettuAlkuaika),
      end_time: parseDate(dataToImport.IstuntoLoppuaika),
      roll_call_time: parseDate(dataToImport.IstuntoNimenhuutoaika),
      article_key: dataToImport.KasiteltavaKohtaTekninenAvain,
      speaker_id: +dataToImport.PuhujaHenkilonumero,
      modified_datetime: parseDateTime(dataToImport.Modified),
      agenda_key: dataToImport.PJTekninenAvain,
      created_datetime: parseDateTime(dataToImport.Created),
      imported_datetime: parseDateTime(dataToImport.Imported),
      state_text_fi: dataToImport.IstuntoTilaSeliteFI?.trim() || null,
      manual_blocked: +dataToImport.ManuaalinenEsto || 0,
      attachment_group_id: dataToImport.AttachmentGroupId
        ? +dataToImport.AttachmentGroupId
        : null,
    };

    const agendaRow = {
      key: dataToImport.PJTekninenAvain,
      title: dataToImport.PJOtsikkoFI,
      state: dataToImport.PJTila,
    };

    insertRows(db)("Agenda", [agendaRow]);
    insertRows(db)("Session", [sessionRow]);
  };

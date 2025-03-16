import { type Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestys"]) => {
    const votingRow: DatabaseTables.Voting = {
      id: +dataToImport.AanestysId,
      number: +dataToImport.AanestysNumero,
      start_time: parseDateTime(dataToImport.AanestysAlkuaika),
      annulled: !!+dataToImport.AanestysMitatoitu,
      title: dataToImport.AanestysOtsikko,
      proceedings_name: dataToImport.AanestysPoytakirja,
      proceedings_url: dataToImport.AanestysPoytakirjaUrl,
      result_url: dataToImport.Url,
      n_yes: +dataToImport.AanestysTulosJaa,
      n_no: +dataToImport.AanestysTulosEi,
      n_abstain: +dataToImport.AanestysTulosTyhjia,
      n_absent: +dataToImport.AanestysTulosPoissa,
      n_total: +dataToImport.AanestysTulosYhteensa,
      section_processing_phase: dataToImport.KohtaKasittelyVaihe,
      session_number: +dataToImport.IstuntoNumero,
      section_id: +dataToImport.KohtaTunniste,
      main_section_id: +dataToImport.PaaKohtaTunniste,
      modified_datetime: "", // TODO: To be added
      session_key: "", // To be added
      section_key: "", // To be added
    };
    insertRows(db)("Voting", [votingRow]);
  };

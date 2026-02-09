import type { Database } from "bun:sqlite";
import { LanguageIds } from "#constants/index";

import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestys"]) => {
    if (dataToImport.KieliId !== LanguageIds.Finnish) {
      return;
    }
    const votingRow: DatabaseTables.Voting = {
      id: +dataToImport.AanestysId,
      number: +dataToImport.AanestysNumero,
      start_time: parseDateTime(dataToImport.AanestysAlkuaika),
      annulled: !!+dataToImport.AanestysMitatoitu,
      title: dataToImport.AanestysOtsikko || null,
      proceedings_name: dataToImport.AanestysPoytakirja,
      proceedings_url: dataToImport.AanestysPoytakirjaUrl,
      result_url: dataToImport.Url,
      n_yes: +dataToImport.AanestysTulosJaa,
      n_no: +dataToImport.AanestysTulosEi,
      n_abstain: +dataToImport.AanestysTulosTyhjia,
      n_absent: +dataToImport.AanestysTulosPoissa,
      n_total: +dataToImport.AanestysTulosYhteensa,
      section_processing_phase: dataToImport.KohtaKasittelyVaihe,
      section_title: dataToImport.KohtaOtsikko,
      session_key: `${dataToImport.IstuntoVPVuosi}/${dataToImport.IstuntoNumero}`,
      section_id: +dataToImport.KohtaTunniste,
      main_section_id: +dataToImport.PaaKohtaTunniste,
      modified_datetime: "", // TODO: To be added
      section_key: "", // To be added
    };
    insertRows(db)("Voting", [votingRow]);
  };

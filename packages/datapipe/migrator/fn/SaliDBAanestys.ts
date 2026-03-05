import type { Database } from "bun:sqlite";
import { LanguageIds } from "#constants/index";
import { extractDocumentTunnusCandidates } from "../salidb-document-ref";
import { insertRows, parseDateTime, trimString } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBAanestys"]) => {
    if (dataToImport.KieliId !== LanguageIds.Finnish) {
      return;
    }
    const annulledRaw =
      (dataToImport as any).AanestysMitatoitu ??
      (dataToImport as any).AanestysMitatoity ??
      dataToImport.AanestysMitatoitu;
    type VotingInsert = Omit<DatabaseTables.Voting, "start_date">;
    const votingRow: VotingInsert = {
      id: +dataToImport.AanestysId,
      number: +dataToImport.AanestysNumero,
      start_time: parseDateTime(dataToImport.AanestysAlkuaika),
      end_time: parseDateTime(dataToImport.AanestysLoppuaika),
      annulled: !!+annulledRaw,
      title: dataToImport.AanestysOtsikko || null,
      title_extra: dataToImport.AanestysLisaOtsikko || null,
      proceedings_name: dataToImport.AanestysPoytakirja,
      proceedings_url: dataToImport.AanestysPoytakirjaUrl,
      result_url: dataToImport.Url,
      parliamentary_item: trimString(dataToImport.AanestysValtiopaivaasia),
      parliamentary_item_url: dataToImport.AanestysValtiopaivaasiaUrl || null,
      n_yes: +dataToImport.AanestysTulosJaa,
      n_no: +dataToImport.AanestysTulosEi,
      n_abstain: +dataToImport.AanestysTulosTyhjia,
      n_absent: +dataToImport.AanestysTulosPoissa,
      n_total: +dataToImport.AanestysTulosYhteensa,
      language_id: dataToImport.KieliId || null,
      section_note: dataToImport.KohtaHuomautus || null,
      section_order: dataToImport.KohtaJarjestys
        ? +dataToImport.KohtaJarjestys
        : null,
      section_processing_title: dataToImport.KohtaKasittelyOtsikko || null,
      section_processing_phase: dataToImport.KohtaKasittelyVaihe,
      section_title: dataToImport.KohtaOtsikko,
      session_key: `${dataToImport.IstuntoVPVuosi}/${dataToImport.IstuntoNumero}`,
      section_id: +dataToImport.KohtaTunniste,
      main_section_id: +dataToImport.PaaKohtaTunniste,
      main_section_note: dataToImport.PaaKohtaHuomautus || null,
      main_section_title: dataToImport.PaaKohtaOtsikko || null,
      sub_section_identifier: dataToImport.AliKohtaTunniste || null,
      agenda_title: dataToImport.PJOtsikko || null,
      modified_datetime: null,
      imported_datetime: parseDateTime(dataToImport.Imported),
      section_key: "", // To be added
    };
    insertRows(db)("Voting", [votingRow]);

    const tunnusList = [
      ...extractDocumentTunnusCandidates(dataToImport.AanestysValtiopaivaasia),
      ...extractDocumentTunnusCandidates(
        dataToImport.AanestysValtiopaivaasiaUrl,
      ),
    ];
    if (tunnusList.length > 0) {
      const refs: DatabaseTables.SaliDBDocumentReference[] = tunnusList.map(
        (tunnus) => ({
          source_type: "voting_item",
          voting_id: +dataToImport.AanestysId,
          section_key: null,
          document_tunnus: tunnus,
          source_text: dataToImport.AanestysValtiopaivaasia || null,
          source_url: dataToImport.AanestysValtiopaivaasiaUrl || null,
          created_datetime: null,
          imported_datetime: parseDateTime(dataToImport.Imported),
        }),
      );
      insertRows(db)("SaliDBDocumentReference", refs);
    }
  };

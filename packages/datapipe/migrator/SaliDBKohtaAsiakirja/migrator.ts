import type { Database } from "bun:sqlite";
import { extractDocumentTunnusCandidates } from "../salidb-document-ref";
import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBKohtaAsiakirja"]) => {
    const row: DatabaseTables.SectionDocumentLink = {
      id: +dataToImport.Id,
      section_key: dataToImport.KohtaTekninenAvain,
      key: dataToImport.TekninenAvain || null,
      name_fi: dataToImport.NimiFI || null,
      link_text_fi: dataToImport.LinkkiTekstiFI || null,
      link_url_fi: dataToImport.LinkkiUrlFI || null,
      created_datetime: parseDateTime(dataToImport.Created),
      modified_datetime: parseDateTime(dataToImport.Modified),
      imported_datetime: parseDateTime(dataToImport.Imported),
    };

    insertRows(db)("SectionDocumentLink", [row]);

    const tunnusList = [
      ...extractDocumentTunnusCandidates(dataToImport.LinkkiUrlFI),
      ...extractDocumentTunnusCandidates(dataToImport.LinkkiTekstiFI),
    ];
    if (tunnusList.length > 0) {
      const refs: DatabaseTables.SaliDBDocumentReference[] = tunnusList.map(
        (tunnus) => ({
          source_type: "section_document",
          voting_id: null,
          section_key: dataToImport.KohtaTekninenAvain,
          document_tunnus: tunnus,
          source_text: dataToImport.LinkkiTekstiFI || null,
          source_url: dataToImport.LinkkiUrlFI || null,
          created_datetime: parseDateTime(dataToImport.Created),
          imported_datetime: parseDateTime(dataToImport.Imported),
        }),
      );
      insertRows(db)("SaliDBDocumentReference", refs);
    }
  };

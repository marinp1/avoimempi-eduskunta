import type { Database } from "bun:sqlite";
import { extractDocumentTunnusCandidates } from "../salidb-document-ref";
import { insertRows, parseDateTime } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBAanestysAsiakirja"]) => {
    const tunnusList = [
      ...extractDocumentTunnusCandidates(dataToImport.Asiakirja),
      ...extractDocumentTunnusCandidates(dataToImport.AsiakirjaUrl),
    ];
    if (tunnusList.length > 0) {
      const refs: DatabaseTables.SaliDBDocumentReference[] = tunnusList.map(
        (tunnus) => ({
          source_type: "voting_document",
          voting_id: +dataToImport.AanestysId,
          section_key: null,
          document_tunnus: tunnus,
          source_text: dataToImport.Asiakirja || null,
          source_url: dataToImport.AsiakirjaUrl || null,
          created_datetime: null,
          imported_datetime: parseDateTime(dataToImport.Imported),
        }),
      );
      insertRows(db)("SaliDBDocumentReference", refs);
    }
  };

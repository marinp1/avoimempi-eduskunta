import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";
import { extractDocumentTunnusCandidates } from "../salidb-document-ref";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestysAsiakirja"]) => {
    const row: DatabaseTables.VotingDocumentLink = {
      id: +dataToImport.AsiakirjaId,
      voting_id: +dataToImport.AanestysId,
      document_label: dataToImport.Asiakirja || null,
      document_url: dataToImport.AsiakirjaUrl || null,
      imported_datetime: parseDateTime(dataToImport.Imported),
    };

    insertRows(db)("VotingDocumentLink", [row]);

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

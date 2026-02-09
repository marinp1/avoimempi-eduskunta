import type { Database } from "bun:sqlite";

import { insertRows } from "../utils";

// Accumulator for batching row inserts
let rowBatch: DatabaseTables.Vote[] = [];
let currentDb: Database | null = null;

const flushBatch = () => {
  if (rowBatch.length > 0 && currentDb) {
    insertRows(currentDb)("Vote", rowBatch);
    rowBatch = [];
  }
};

export const flushVotes = () => {
  flushBatch();
  currentDb = null;
};

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestysEdustaja"]) => {
    currentDb = db;

    // Filter out Swedish duplicate votes (Finnish versions exist separately)
    const vote = dataToImport.EdustajaAanestys?.trim();
    const swedishVotesToDrop = ["Ja", "Nej", "Blank", "Frånvarande", "Avstår"];
    if (swedishVotesToDrop.includes(vote)) {
      return;
    }

    const voteRow: DatabaseTables.Vote = {
      id: +dataToImport.EdustajaId,
      voting_id: +dataToImport.AanestysId,
      person_id: +dataToImport.EdustajaHenkiloNumero,
      vote,
      group_abbreviation:
        dataToImport.EdustajaRyhmaLyhenne?.trim().toLowerCase(),
    };

    rowBatch.push(voteRow);

    // Auto-flush every 5000 rows to maximize batch insert performance
    if (rowBatch.length >= 5000) {
      flushBatch();
    }
  };

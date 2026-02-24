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

const SWEDISH_VOTES_TO_DROP = new Set([
  "ja",
  "nej",
  "blank",
  "frånvarande",
  "avstår",
]);

const normalizeVote = (
  voteRaw?: string | null,
): DatabaseTables.Vote["vote"] | null => {
  const normalized = voteRaw?.trim().normalize("NFC");
  if (!normalized) return null;

  const key = normalized.toLowerCase();

  if (SWEDISH_VOTES_TO_DROP.has(key)) return null;

  switch (key) {
    case "jaa":
      return "Jaa";
    case "ei":
      return "Ei";
    case "poissa":
      return "Poissa";
    case "tyhjää":
    case "tyhjä":
    case "tyhjiä":
    case "tyhjia":
      return "Tyhjää";
    default:
      return null;
  }
};

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBAanestysEdustaja"]) => {
    currentDb = db;

    const vote = normalizeVote(dataToImport.EdustajaAanestys);
    if (!vote) {
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

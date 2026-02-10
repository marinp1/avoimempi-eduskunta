import type { Database } from "bun:sqlite";

import { insertRows, parseDateTime } from "../utils";

const parseIntSafe = (value: string | null | undefined) => {
  if (!value) return null;
  const parsed = parseInt(value.trim(), 10);
  return Number.isNaN(parsed) ? null : parsed;
};

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestysJakauma"]) => {
    const row: DatabaseTables.VotingDistribution = {
      id: +dataToImport.JakaumaId,
      voting_id: +dataToImport.AanestysId,
      group_name: dataToImport.Ryhma || null,
      yes: parseIntSafe(dataToImport.Jaa),
      no: parseIntSafe(dataToImport.Ei),
      abstain: parseIntSafe(dataToImport.Tyhjia),
      absent: parseIntSafe(dataToImport.Poissa),
      total: parseIntSafe(dataToImport.Yhteensa),
      distribution_type: dataToImport.Tyyppi || null,
      imported_datetime: parseDateTime(dataToImport.Imported),
    };

    insertRows(db)("VotingDistribution", [row]);
  };

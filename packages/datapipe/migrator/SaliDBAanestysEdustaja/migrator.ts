import { type Database } from "bun:sqlite";

import { insertRows } from "../utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestysEdustaja"]) => {
    // Filter out Swedish votes
    const swedishVotes = ["Ja", "Nej", "Blank", "Frånvarande"];
    if (swedishVotes.includes(dataToImport.EdustajaAanestys?.trim())) {
      return;
    }

    const voteRow: DatabaseTables.Vote = {
      id: +dataToImport.EdustajaId,
      voting_id: +dataToImport.AanestysId,
      person_id: +dataToImport.EdustajaHenkiloNumero,
      vote: dataToImport.EdustajaAanestys.trim(),
      group_abbrviation: dataToImport.EdustajaRyhmaLyhenne,
    };
    insertRows(db)("Vote", [voteRow]);
  };

import { type Database } from "bun:sqlite";

import { insertRows } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBAanestysEdustaja"]) => {
    const voteRow: DatabaseTables.Vote = {
      id: +dataToImport.EdustajaId,
      voting_id: +dataToImport.AanestysId,
      person_id: +dataToImport.EdustajaHenkiloNumero,
      vote: dataToImport.EdustajaAanestys,
      group_abbrviation: dataToImport.EdustajaRyhmaLyhenne,
    };
    insertRows(db)("Vote", [voteRow]);
  };

import { type Database } from "bun:sqlite";

import { parseDateTime } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBKohtaAanestys"]) => {
    const { id } = db
      .prepare<Pick<DatabaseTables.Voting, "id">, { $key: string }>(
        "SELECT id FROM Voting WHERE session_key = $key"
      )
      .get({ $key: dataToImport.IstuntoTekninenAvain }) ?? { id: null };

    if (id === null) {
      console.log(
        `id is null for session_key = ${dataToImport.IstuntoTekninenAvain}`
      );
      return;
    }

    const stmt = db.prepare<
      void,
      {
        $dt: string;
        $section_key: string;
        $id: number;
      }
    >(`
            UPDATE Voting
            SET modified_datetime = $dt,
                section_key = $section_key
            WHERE id = $id
        `);
    stmt.run({
      $dt: parseDateTime(dataToImport.Modified),
      $section_key: dataToImport.KohtaTekninenAvain,
      $id: +id,
    });
  };

import { type Database } from "bun:sqlite";

import { parseDateTime } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBKohtaAanestys"]) => {
    const { year, number } = db
      .prepare<
        Pick<DatabaseTables.Session, "year" | "number">,
        { $key: string }
      >("SELECT year, number FROM Session WHERE key = $key")
      .get({ $key: dataToImport.IstuntoTekninenAvain })!;

    const { id } = db
      .prepare<
        Pick<DatabaseTables.Voting, "id">,
        { $number: number; $year: number }
      >(
        "SELECT id FROM Voting WHERE session_number = $number AND session_year = $year"
      )
      .get({ $number: number, $year: year! }) ?? { id: null };

    if (id === null) {
      console.log(
        `id is null for session_number = ${number} and session_year = ${year}`
      );
      return;
    }

    const stmt = db.prepare<
      void,
      {
        $dt: string;
        $session_key: string;
        $section_key: string;
        $id: number;
      }
    >(`
            UPDATE Voting
            SET modified_datetime = $dt,
                session_key = $session_key,
                section_key = $section_key
            WHERE id = $id
        `);
    stmt.run({
      $dt: parseDateTime(dataToImport.Modified),
      $session_key: dataToImport.IstuntoTekninenAvain,
      $section_key: dataToImport.KohtaTekninenAvain,
      $id: +id,
    });
  };

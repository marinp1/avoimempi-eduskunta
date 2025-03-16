import { type Database } from "bun:sqlite";

import { parseDateTime } from "migrator/utils";

export default (db: Database) =>
  async (dataToImport: RawDataModels["SaliDBKohtaAanestys"]) => {
    const stmt = db.prepare<
      void,
      {
        $dt: string;
        $session_key: string;
        $section_key: string;
        $number: number;
      }
    >(`
            UPDATE Voting
            SET modified_datetime = $dt,
                session_key = $session_key,
                section_key = $section_key
            WHERE number = $number
        `);
    stmt.run({
      $dt: parseDateTime(dataToImport.Modified),
      $session_key: dataToImport.IstuntoTekninenAvain,
      $section_key: dataToImport.KohtaTekninenAvain,
      $number: +dataToImport.Aanestysnumero,
    });
  };

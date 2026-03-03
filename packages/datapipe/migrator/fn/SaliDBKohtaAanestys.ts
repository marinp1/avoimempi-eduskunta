import type { Database } from "bun:sqlite";

import { parseDateTime } from "../utils";

export default (db: Database) =>
  (dataToImport: RawDataModels["SaliDBKohtaAanestys"]) => {
    const votingNumber = +dataToImport.Aanestysnumero;
    if (!Number.isFinite(votingNumber)) {
      console.log(
        `invalid voting number for session_key = ${dataToImport.IstuntoTekninenAvain}`,
      );
      return;
    }

    const { id } = db
      .prepare<
        Pick<DatabaseTables.Voting, "id">,
        { $key: string; $number: number }
      >(
        `SELECT id
         FROM Voting
         WHERE session_key = $key
           AND number = $number
         ORDER BY id DESC
         LIMIT 1`,
      )
      .get({
        $key: dataToImport.IstuntoTekninenAvain,
        $number: votingNumber,
      }) ?? { id: null };

    if (id === null) {
      console.log(
        `id is null for session_key = ${dataToImport.IstuntoTekninenAvain}, voting_number = ${votingNumber}`,
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

import type { Database } from "bun:sqlite";
import * as queries from "../queries";

export class MetadataRepository {
  constructor(private readonly db: Database) {}

  public fetchParliamentComposition(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid date");
    const $date = dateObj.toISOString();
    const stmt = this.db.query<
      DatabaseQueries.GetParliamentComposition,
      { $date: string }
    >(queries.currentComposition);
    const data = stmt.all({ $date });
    stmt.finalize();
    return data;
  }

  public fetchHallituskaudet() {
    const stmt = this.db.prepare<
      {
        government: string;
        start_date: string;
        end_date: string | null;
      },
      []
    >(queries.hallituskaudet);
    const rows = stmt.all();
    stmt.finalize();

    return rows.map((row) => ({
      id: `${row.start_date}|${row.government}`,
      name: row.government,
      label: `${row.government} (${row.start_date} - ${row.end_date ?? "..."})`,
      startDate: row.start_date,
      endDate: row.end_date,
    }));
  }
}

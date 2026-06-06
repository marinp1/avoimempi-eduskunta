import type { Database } from "bun:sqlite";
import hallituskaudet from "./sql/metadata-governments.sql";

export class MetadataRepository {
  constructor(private readonly db: Database) {}

  public fetchHallituskaudet() {
    const stmt = this.db.prepare<
      {
        id: number;
        government: string;
        start_date: string;
        end_date: string | null;
      },
      []
    >(hallituskaudet);
    const rows = stmt.all();
    stmt.finalize();

    return rows.map((row) => ({
      id: row.id,
      name: row.government,
      label: `${row.government} (${row.start_date} - ${row.end_date ?? "..."})`,
      startDate: row.start_date,
      endDate: row.end_date,
    }));
  }
}

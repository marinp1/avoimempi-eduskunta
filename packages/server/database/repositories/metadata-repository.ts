import type { Database } from "bun:sqlite";
import currentComposition from "../queries/CURRENT_COMPOSITION.sql";
import governmentMembers from "../queries/GOVERNMENT_MEMBERS.sql";
import governmentsList from "../queries/GOVERNMENTS_LIST.sql";
import hallituskaudet from "../queries/HALLITUSKAUDET.sql";

export class MetadataRepository {
  constructor(private readonly db: Database) {}

  public fetchParliamentComposition(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid date");
    const $date = dateObj.toISOString();
    const stmt = this.db.query<
      DatabaseQueries.GetParliamentComposition,
      { $date: string }
    >(currentComposition);
    const data = stmt.all({ $date });
    stmt.finalize();
    return data;
  }

  public fetchGovernments() {
    const stmt = this.db.prepare<
      {
        id: number;
        name: string;
        start_date: string;
        end_date: string | null;
        member_count: number;
        parties: string | null;
      },
      []
    >(governmentsList);
    const rows = stmt.all();
    stmt.finalize();
    return rows.map((row) => ({
      ...row,
      parties: row.parties ? row.parties.split("|").filter(Boolean) : [],
    }));
  }

  public fetchGovernmentByDate(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (Number.isNaN(dateObj.getTime())) throw new Error("Invalid date");

    const isoDate = dateObj.toISOString().split("T")[0];
    return this.fetchGovernments().find(
      (row) =>
        row.start_date <= isoDate &&
        (row.end_date === null || row.end_date >= isoDate),
    );
  }

  public fetchGovernmentMembers(params: { id: number }) {
    const stmt = this.db.prepare<
      {
        id: number;
        person_id: number | null;
        name: string | null;
        ministry: string | null;
        start_date: string | null;
        end_date: string | null;
        first_name: string | null;
        last_name: string | null;
        party: string | null;
        gender: string | null;
      },
      { $id: number }
    >(governmentMembers);
    const rows = stmt.all({ $id: params.id });
    stmt.finalize();
    return rows;
  }

  public fetchHallituskaudet() {
    const stmt = this.db.prepare<
      {
        government: string;
        start_date: string;
        end_date: string | null;
      },
      []
    >(hallituskaudet);
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

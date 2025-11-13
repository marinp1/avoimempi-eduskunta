import { Database } from "bun:sqlite";
import * as queries from "./queries";
import { getDatabasePath } from "#database";

export class DatabaseConnection {
  #database: Database | null = null;

  private get db() {
    if (!this.#database) throw new Error("Database not connected");
    return this.#database;
  }

  public async fetchParliamentComposition(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
    const $date = dateObj.toISOString();
    const stmt = this.db.query<
      DatabaseQueries.GetParliamentComposition,
      { $date: string }
    >(queries.currentComposition);
    const data = stmt.all({ $date });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativePage(params: {
    page: number;
    limit: number;
  }) {
    const offset = (params.page - 1) * params.limit;
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $limit: number; $offset: number }
    >(queries.sql`SELECT * FROM Representative LIMIT $limit OFFSET $offset`);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  public async fetchPersonGroupMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.ParliamentGroupMembership,
      { $personId: number }
    >(
      queries.sql`SELECT pgm.* FROM Representative r JOIN ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id WHERE r.person_id = $personId ORDER BY start_date ASC;`
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonTerms(params: { id: string }) {
    const stmt = this.db.prepare<DatabaseTables.Term, { $personId: number }>(
      queries.sql`SELECT t.* FROM Representative r JOIN term t ON r.person_id = t.person_id WHERE r.person_id = $personId ORDER BY t.start_date ASC;`
    );
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchPersonVotes(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseQueries.VotesByPerson,
      { $personId: number }
    >(queries.votesByPerson);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativeDetails(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.Representative,
      { $personId: number }
    >(queries.representativeDetails);
    const data = stmt.get({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchRepresentativeDistricts(params: { id: string }) {
    const stmt = this.db.prepare<
      {
        id: number;
        person_id: number;
        district_name: string;
        start_date: string;
        end_date: string;
      },
      { $personId: number }
    >(queries.representativeDistricts);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchLeavingParliamentRecords(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.LeavingParliament,
      { $personId: number }
    >(queries.leavingParliamentRecords);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchTrustPositions(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.TrustPosition,
      { $personId: number }
    >(queries.trustPositions);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async fetchGovernmentMemberships(params: { id: string }) {
    const stmt = this.db.prepare<
      DatabaseTables.GovernmentMembership,
      { $personId: number }
    >(queries.governmentMemberships);
    const data = stmt.all({ $personId: +params.id });
    stmt.finalize();
    return data;
  }

  public async queryVotings(params: { q: string }) {
    const stmt = this.db.prepare<DatabaseTables.Voting, []>(
      queries.sql`SELECT v.* FROM voting v WHERE v.section_title LIKE '%${params.q}%' ORDER BY start_time ASC LIMIT 100`
    );
    const data = stmt.all();
    stmt.finalize();
    return data;
  }

  #connectToDatabase() {
    const databasePath = getDatabasePath();
    this.#database = new Database(databasePath, {
      create: true,
      readonly: true,
    });
    this.#database.exec("PRAGMA journal_mode = WAL;");
    return this.#database;
  }

  #disconnect() {
    this.#database?.close();
  }

  constructor() {
    this.#connectToDatabase();
    return this;
  }
}

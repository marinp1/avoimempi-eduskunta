import { Database } from "bun:sqlite";
import { migrate, getMigrations } from "bun-sqlite-migrations";
import path from "path";

export class DatabaseConnection {
  #database: Database | null = null;

  private get db() {
    if (!this.#database) throw new Error("Database not connected");
    return this.#database;
  }

  #currentCompositionSql = `
SELECT
    r.person_id,
    r.last_name,
    r.first_name,
    r.sort_name,
    r.gender,
    r.birth_date,
    r.birth_place,
    r.death_date,
    r.death_place,
    r.profession,
    t.start_date AS t_start_date,
    t.end_date AS t_end_date
FROM
    representative r
JOIN
    term t ON r.person_id = t.person_id
WHERE
    t.start_date <= $date
    AND (t.end_date IS NULL OR t.end_date >= $date)
    AND NOT EXISTS (
        SELECT 1
        FROM temporaryabsence ta
        WHERE ta.person_id = r.person_id
          AND ta.start_date <= $date
          AND (ta.end_date IS NULL OR ta.end_date >= $date)
    )
    `;

  public async fetchParliamentComposition(params: { date: string }) {
    const dateObj = new Date(params.date);
    if (isNaN(dateObj.getTime())) throw new Error("Invalid date");
    const $date = dateObj.toISOString();
    const stmt = this.db.query<
      DatabaseFunctions.GetParliamentComposition,
      { $date: string }
    >(this.#currentCompositionSql);
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
    >(`SELECT * FROM Representative LIMIT $limit OFFSET $offset`);
    const data = stmt.all({ $limit: params.limit, $offset: offset });
    stmt.finalize();
    return data;
  }

  #connectToDatabase() {
    this.#database = new Database("avoimempi-eduskunta.db", { create: true });
    migrate(
      this.#database,
      getMigrations(path.resolve(import.meta.dirname, "migrations"))
    );
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

import { Database } from "bun:sqlite";
import { migrate, getMigrations } from "bun-sqlite-migrations";
import path from "path";

import * as queries from "../server/queries";

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
      DatabaseFunctions.GetParliamentComposition,
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

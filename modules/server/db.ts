import { SQL } from "bun";

export class DatabaseConnection {
  static instance: DatabaseConnection;

  #connection: SQL | null = null;

  public get sql() {
    if (!this.#connection) throw new Error("Connection not ready");
    return this.#connection;
  }

  #connectToDatabase() {
    this.#connection = new SQL(
      new URL(
        `postgres://${process.env.POSTGRES_USER}:${
          process.env.POSTGRES_PASSWORD
        }@${process.env.POSTGRES_HOST ?? "localhost"}:5432/${
          process.env.POSTGRES_DB
        }`
      ),
      {
        max: 20,
        idleTimeout: 30,
        maxLifetime: 3600,
        connectionTimeout: 10,
      }
    );
  }

  #disconnect(force: boolean = false) {
    this.#connection?.close(force ? { timeout: 0 } : {});
  }

  constructor() {
    this.#connectToDatabase();
    return this;
  }
}

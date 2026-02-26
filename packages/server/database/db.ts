import { Database } from "bun:sqlite";
import { getDatabasePath } from "#database";
import { SQLITE_PRAGMAS } from "./sql-statements";

export class DatabaseConnection {
  public readonly db: Database;

  constructor() {
    const databasePath = getDatabasePath();
    console.log("Using", databasePath);

    this.db = new Database(databasePath, {
      create: false,
      readonly: true,
    });
    this.db.exec(SQLITE_PRAGMAS.queryOnlyOn);
    this.db.exec(SQLITE_PRAGMAS.tempStoreMemory);
  }
}

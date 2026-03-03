import type { Database } from "bun:sqlite";
import { createExpertStatementSubMigrator } from "./_expert-statement.ts";

export default function createSubMigrator(db: Database) {
  return createExpertStatementSubMigrator(db, "asiantuntijasuunnitelma");
}

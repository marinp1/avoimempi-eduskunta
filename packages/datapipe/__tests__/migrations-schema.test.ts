import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createTestDb } from "./helpers/setup-db";

const MIGRATIONS_DIR = join(import.meta.dirname, "../migrator/migrations");

const getActiveMigrationFiles = () =>
  readdirSync(MIGRATIONS_DIR)
    .filter((file) => /^V001\.\d+__.+\.sql$/.test(file))
    .sort();

const getTableNames = (db: ReturnType<typeof createTestDb>) =>
  (db.query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all() as {
    name: string;
  }[]).map((row) => row.name);

const getColumnNames = (
  db: ReturnType<typeof createTestDb>,
  tableName: string,
  useTableXInfo = false,
) =>
  (
    db
      .query(
        `PRAGMA ${useTableXInfo ? "table_xinfo" : "table_info"}(${tableName})`,
      )
      .all() as { name: string }[]
  ).map((row) => row.name);

describe("Migration schema", () => {
  test("uses expected active migration files", () => {
    expect(getActiveMigrationFiles()).toEqual([
      "V001.001__core_parliament_schema.sql",
      "V001.002__vaski_roll_call_schema.sql",
    ]);
  });

  test("bootstrap migration has no ALTER TABLE or DROP statements", () => {
    const sql = readFileSync(
      join(MIGRATIONS_DIR, "V001.001__core_parliament_schema.sql"),
      "utf-8",
    );

    expect(sql).not.toMatch(/\bALTER\s+TABLE\b/i);
    expect(sql).not.toMatch(/\bDROP\s+(TABLE|VIEW|INDEX|TRIGGER)\b/i);
  });

  test("creates expected tables and excludes removed document/vaski tables", () => {
    const db = createTestDb();
    try {
      const tableNames = getTableNames(db);

      expect(tableNames).toContain("Representative");
      expect(tableNames).toContain("Session");
      expect(tableNames).toContain("Section");
      expect(tableNames).toContain("Voting");
      expect(tableNames).toContain("Vote");
      expect(tableNames).toContain("Speech");
      expect(tableNames).toContain("SectionDocumentLink");
      expect(tableNames).toContain("SessionNotice");
      expect(tableNames).toContain("SaliDBDocumentReference");
      expect(tableNames).toContain("RollCallReport");
      expect(tableNames).toContain("RollCallEntry");

      expect(tableNames).not.toContain("Document");
      expect(tableNames).not.toContain("DocumentActor");
      expect(tableNames).not.toContain("DocumentSubject");
      expect(tableNames).not.toContain("DocumentAttachment");
      expect(tableNames).not.toContain("DocumentRelation");
      expect(tableNames).not.toContain("SessionSectionSpeech");
      expect(tableNames).not.toContain("SessionMinutesItem");
      expect(tableNames).not.toContain("SessionMinutesAttachment");
      expect(tableNames).not.toContain("CommitteeSession");
      expect(tableNames.some((name) => name.startsWith("DocType_"))).toBe(false);
      expect(tableNames.some((name) => name.startsWith("Vaski"))).toBe(false);
    } finally {
      db.close();
    }
  });

  test("inlines evolved columns directly into base tables", () => {
    const db = createTestDb();
    try {
      const representativeColumns = getColumnNames(db, "Representative", true);
      const pgmColumns = getColumnNames(db, "ParliamentaryGroupMembership", true);
      const termColumns = getColumnNames(db, "Term");
      const sessionColumns = getColumnNames(db, "Session");
      const sectionColumns = getColumnNames(db, "Section");
      const votingColumns = getColumnNames(db, "Voting", true);
      const voteColumns = getColumnNames(db, "Vote");
      const speechColumns = getColumnNames(db, "Speech");

      expect(representativeColumns).toContain("birth_year");
      expect(pgmColumns).toContain("group_abbreviation");
      expect(termColumns).toContain("start_year");
      expect(termColumns).toContain("end_year");
      expect(sessionColumns).toContain("created_datetime");
      expect(sessionColumns).toContain("roll_call_document_id");
      expect(sectionColumns).toContain("default_speech_type");
      expect(sectionColumns).toContain("document_tunnus");
      expect(votingColumns).toContain("start_date");
      expect(votingColumns).toContain("agenda_title");
      expect(voteColumns).toContain("group_abbreviation");
      expect(voteColumns).not.toContain("group_abbrviation");
      expect(speechColumns).toContain("created_datetime");
      expect(speechColumns).toContain("order_raw");

      const idxSessionDateCount = (
        db
          .query(
            "SELECT COUNT(*) as c FROM sqlite_master WHERE type='index' AND name='idx_session_date'",
          )
          .get() as { c: number }
      ).c;
      expect(idxSessionDateCount).toBe(1);
    } finally {
      db.close();
    }
  });
});

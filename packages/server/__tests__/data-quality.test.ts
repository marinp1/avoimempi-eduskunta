import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Data quality tests against the REAL database.
 *
 * These tests document known data issues that should be fixed in the
 * migrators (packages/datapipe/migrator/) rather than worked around
 * in SQL queries. When a migrator fix is applied and the database is
 * rebuilt, the corresponding test should start passing.
 *
 * Skipped if the database file is not present.
 */

const DB_PATH = join(import.meta.dirname, "../../../avoimempi-eduskunta.db");
const DB_EXISTS = existsSync(DB_PATH);

let db: Database;

beforeAll(() => {
  if (!DB_EXISTS) return;
  db = new Database(DB_PATH, { readonly: true });
  db.exec("PRAGMA journal_mode = WAL;");
});

afterAll(() => {
  if (db) db.close();
});

describe.skipIf(!DB_EXISTS)("Data quality", () => {
  // ─── WHITESPACE ISSUES ────────────────────────────────────

  describe("Whitespace: no leading/trailing spaces in data", () => {
    test("Vote.group_abbreviation has no trailing whitespace", () => {
      // KNOWN ISSUE: All 4.2M rows are padded to 10 chars (e.g. "sd        ")
      // FIX: TRIM() in SaliDBAanestysEdustaja migrator
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Vote
           WHERE group_abbreviation != TRIM(group_abbreviation)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── NULL vs EMPTY STRING CONSISTENCY ─────────────────────

  describe("NULL vs empty string: use NULL consistently for missing data", () => {
    test("Speech.party_abbreviation uses NULL (not empty string) for missing values", () => {
      // KNOWN ISSUE: 754 empty strings + 25 NULLs
      // FIX: Coerce '' to NULL in SaliDBPuheenvuoro migrator
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Speech
           WHERE party_abbreviation = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("Speech.ministry uses NULL (not empty string) for non-ministers", () => {
      // KNOWN ISSUE: 122,463 empty strings + 161 NULLs
      // FIX: Coerce '' to NULL in SaliDBPuheenvuoro migrator
      const { c } = db
        .query(`SELECT COUNT(*) as c FROM Speech WHERE ministry = ''`)
        .get() as any;
      expect(c).toBe(0);
    });

    test("Section.note uses NULL (not empty string) for missing notes", () => {
      // KNOWN ISSUE: 15,456 empty strings + 4,506 NULLs
      const { c } = db
        .query(`SELECT COUNT(*) as c FROM Section WHERE note = ''`)
        .get() as any;
      expect(c).toBe(0);
    });

    test("Section.processing_title uses NULL (not empty string) when absent", () => {
      // KNOWN ISSUE: 1,567 empty strings + 674 NULLs
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Section
           WHERE processing_title = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("Section.resolution uses NULL (not empty string) when absent", () => {
      // KNOWN ISSUE: 14,313 empty strings + 170 NULLs
      const { c } = db
        .query(`SELECT COUNT(*) as c FROM Section WHERE resolution = ''`)
        .get() as any;
      expect(c).toBe(0);
    });

    test("Voting.title uses NULL (not empty string) when absent", () => {
      // KNOWN ISSUE: 8 empty strings + 6 NULLs
      const { c } = db
        .query(`SELECT COUNT(*) as c FROM Voting WHERE title = ''`)
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── CAPITALIZATION CONSISTENCY ───────────────────────────

  describe("Capitalization: party/group codes should be lowercase", () => {
    test("Vote.group_abbreviation values are all lowercase", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Vote
           WHERE group_abbreviation != LOWER(group_abbreviation)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("Speech.party_abbreviation values are all lowercase", () => {
      // KNOWN ISSUE: PV (3 rows) is uppercase
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Speech
           WHERE party_abbreviation IS NOT NULL
             AND party_abbreviation != ''
             AND party_abbreviation != LOWER(party_abbreviation)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("RollCallEntry.party values are all lowercase", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RollCallEntry
           WHERE party IS NOT NULL
             AND party != LOWER(party)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("VaskiDocument.document_type uses expected lowercase values", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocument
           WHERE document_type NOT IN ('pöytäkirja', 'nimenhuutoraportti')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── ROLL CALL NORMALIZATION ──────────────────────────────

  describe("RollCallEntry name formatting", () => {
    test("first_name and last_name are present", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RollCallEntry
           WHERE first_name IS NULL OR TRIM(first_name) = ''
              OR last_name IS NULL OR TRIM(last_name) = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no leading/trailing whitespace in names", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RollCallEntry
           WHERE first_name != TRIM(first_name)
              OR last_name != TRIM(last_name)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── VOTE VALUE CONSISTENCY ──────────────────────────────

  describe("Vote.vote: consistent language", () => {
    test("no Swedish vote values remain (Avstår should be Tyhjää)", () => {
      // KNOWN ISSUE: 15,701 rows have "Avstår" (Swedish for "Abstain")
      // Swedish votes (Ja, Nej, Frånvarande) are filtered out by the migrator
      // but "Avstår" maps to "Tyhjää" and should be converted
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── ROLL CALL STATUS CONSISTENCY ─────────────────────────

  describe("RollCallReport.status: known values", () => {
    test("status only contains known source codes", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RollCallReport
           WHERE status IS NOT NULL
             AND status NOT IN ('5', '8')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── DOCUMENT SOURCE PATH NORMALIZATION ───────────────────

  describe("Source path consistency", () => {
    test("VaskiDocument.source_path is non-empty", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocument
           WHERE source_path IS NULL OR TRIM(source_path) = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("SpeechContent.source_path is non-empty", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM SpeechContent
           WHERE source_path IS NULL OR TRIM(source_path) = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── COLUMN NAMING ────────────────────────────────────────

  describe("Schema: column naming", () => {
    test("Vote table has column 'group_abbreviation' (not typo 'group_abbrviation')", () => {
      const cols = db.query(`PRAGMA table_info(Vote)`).all() as any[];
      const colNames = cols.map((c: any) => c.name);
      expect(colNames).toContain("group_abbreviation");
      expect(colNames).not.toContain("group_abbrviation");
    });

    test("legacy document tables are not present", () => {
      const tables = db
        .query("SELECT name FROM sqlite_master WHERE type='table'")
        .all() as Array<{ name: string }>;
      const tableNames = new Set(tables.map((table) => table.name));

      const legacyTables = [
        "SessionSectionSpeech",
        "Document",
        "DocumentActor",
        "DocumentSubject",
        "DocumentRelation",
        "SessionMinutesItem",
      ];

      for (const legacyTable of legacyTables) {
        expect(tableNames.has(legacyTable)).toBe(false);
      }
    });
  });
});

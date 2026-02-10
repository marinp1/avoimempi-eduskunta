import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
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
        .query(
          `SELECT COUNT(*) as c FROM Speech WHERE ministry = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("Section.note uses NULL (not empty string) for missing notes", () => {
      // KNOWN ISSUE: 15,456 empty strings + 4,506 NULLs
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Section WHERE note = ''`,
        )
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
        .query(
          `SELECT COUNT(*) as c FROM Section WHERE resolution = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("Voting.title uses NULL (not empty string) when absent", () => {
      // KNOWN ISSUE: 8 empty strings + 6 NULLs
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Voting WHERE title = ''`,
        )
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

    test("VaskiMinutesSpeech.party values are all lowercase", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiMinutesSpeech
           WHERE party IS NOT NULL
             AND party != LOWER(party)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("VaskiDocument.document_type_code has no lowercase variants", () => {
      // KNOWN ISSUE: "Kk" (16 rows) should be "KK", "kkb" (1 row) is anomalous
      // Note: document_type_codes use a specific convention (e.g. KK, HE, PeVL)
      // so we check for known bad variants rather than enforcing all-caps
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocument
           WHERE document_type_code IN ('Kk', 'kkb')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── SPEECH TYPE NORMALIZATION ────────────────────────────

  describe("VaskiMinutesSpeech.speech_type: formatting artifacts cleaned", () => {
    test("no hyphenated word breaks in speech_type", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiMinutesSpeech
           WHERE speech_type LIKE '%-%'
             AND speech_type NOT LIKE '%(nopeatahtinen puheenvuoro)%'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no leading/trailing whitespace in speech_type", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiMinutesSpeech
           WHERE speech_type IS NOT NULL
             AND (speech_type LIKE '( %' OR speech_type LIKE '% )')`,
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

  // ─── DOCUMENT STATUS CONSISTENCY ──────────────────────────

  describe("VaskiDocument.status: human-readable values", () => {
    test("no numeric status codes", () => {
      // KNOWN ISSUE: status "5" (10,921 rows), "8" (139 rows), "1234" (2 rows)
      // These should be mapped to their Finnish text equivalents
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocument
           WHERE status GLOB '[0-9]*'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── AUTHOR ROLE NORMALIZATION ────────────────────────────

  describe("VaskiDocumentActor.position_text: consistent formatting", () => {
    test("no missing spaces after hyphens (kunta-ja vs kunta- ja)", () => {
      // KNOWN ISSUE: "kunta-ja alueministeri" (4 rows) vs "kunta- ja alueministeri" (36 rows)
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocumentActor
           WHERE role_code = 'laatija'
             AND position_text = 'kunta-ja alueministeri'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("author_role values start with lowercase", () => {
      // KNOWN ISSUE: "Kulttuuri- ja asuntoministeri" (1 row) starts with uppercase
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocumentActor
           WHERE role_code = 'laatija'
             AND position_text IS NOT NULL
             AND position_text != 'Valiokunta'
             AND UNICODE(position_text) BETWEEN 65 AND 90`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no extra comma before 'ja' (urheilu-, ja vs urheilu- ja)", () => {
      // KNOWN ISSUE: "liikunta-, urheilu-, ja nuorisoministeri" (1 row)
      // vs "liikunta-, urheilu- ja nuorisoministeri" (16 rows)
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM VaskiDocumentActor
           WHERE role_code = 'laatija'
             AND position_text LIKE '%, ja %'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── COLUMN NAMING ────────────────────────────────────────

  describe("Schema: column naming", () => {
    test("Vote table has column 'group_abbreviation' (not typo 'group_abbrviation')", () => {
      const cols = db
        .query(`PRAGMA table_info(Vote)`)
        .all() as any[];
      const colNames = cols.map((c: any) => c.name);
      expect(colNames).toContain("group_abbreviation");
      expect(colNames).not.toContain("group_abbrviation");
    });
  });
});

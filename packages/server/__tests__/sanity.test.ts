import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { existsSync } from "fs";
import { join } from "path";

/**
 * Sanity tests against the REAL database file.
 *
 * These are strict, zero-tolerance integrity checks for official
 * Finnish Parliament (Eduskunta) data. No omissions or broken
 * references are acceptable.
 *
 * Tests are skipped if the database file is not present.
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

describe.skipIf(!DB_EXISTS)("Real database sanity checks", () => {
  // ─── TABLE EXISTENCE & ROW COUNTS ───────────────────────────

  describe("Table existence and row counts", () => {
    test("all core tables exist", () => {
      const tables = db
        .query(
          "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
        )
        .all() as { name: string }[];
      const tableNames = tables.map((t) => t.name);

      const expectedTables = [
        "Representative",
        "Term",
        "ParliamentaryGroup",
        "ParliamentaryGroupMembership",
        "GovernmentMembership",
        "Committee",
        "CommitteeMembership",
        "District",
        "RepresentativeDistrict",
        "Education",
        "WorkHistory",
        "TrustPosition",
        "Agenda",
        "Session",
        "Section",
        "Voting",
        "Vote",
        "Speech",
        "ExcelSpeech",
        "VaskiDocument",
      ];
      for (const expected of expectedTables) {
        expect(tableNames).toContain(expected);
      }
    });

    test("Representative table has >1000 MPs (historically)", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Representative")
        .get() as any;
      expect(c).toBeGreaterThan(1000);
    });

    test("Session table has >100 sessions", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Session")
        .get() as any;
      expect(c).toBeGreaterThan(100);
    });

    test("Voting table has >1000 votings", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Voting")
        .get() as any;
      expect(c).toBeGreaterThan(1000);
    });

    test("Vote table has individual vote records", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Vote")
        .get() as any;
      expect(c).toBeGreaterThan(100000);
    });

    test("Section table has >1000 sections", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Section")
        .get() as any;
      expect(c).toBeGreaterThan(1000);
    });

    test("Speech table has >10000 speeches", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Speech")
        .get() as any;
      expect(c).toBeGreaterThan(10000);
    });

    test("Term table has >1000 terms", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Term")
        .get() as any;
      expect(c).toBeGreaterThan(1000);
    });
  });

  // ─── ISSUE #7: PERSON UNIQUENESS ───────────────────────────

  describe("Person uniqueness (#7)", () => {
    test("each person has a unique person_id", () => {
      const { dupes } = db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT person_id FROM Representative
             GROUP BY person_id HAVING COUNT(*) > 1
           )`,
        )
        .get() as any;
      expect(dupes).toBe(0);
    });

    test("no representatives with NULL person_id", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Representative WHERE person_id IS NULL",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every representative has a first_name and last_name", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE first_name IS NULL OR last_name IS NULL
              OR TRIM(first_name) = '' OR TRIM(last_name) = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── ISSUE #7: SESSION KEY + DATE ──────────────────────────

  describe("Session structure (#7)", () => {
    test("every session has a non-empty key", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Session WHERE key IS NULL OR key = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every session has a date", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Session WHERE date IS NULL OR date = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("session keys are unique", () => {
      const { total } = db
        .query("SELECT COUNT(*) as total FROM Session")
        .get() as any;
      const { unique_count } = db
        .query("SELECT COUNT(DISTINCT key) as unique_count FROM Session")
        .get() as any;
      expect(unique_count).toBe(total);
    });

    test("session count matches agenda count (1:1)", () => {
      const { sessions } = db
        .query("SELECT COUNT(*) as sessions FROM Session")
        .get() as any;
      const { agendas } = db
        .query("SELECT COUNT(*) as agendas FROM Agenda")
        .get() as any;
      expect(sessions).toBe(agendas);
    });
  });

  // ─── ISSUE #7: SECTION → SESSION LINKAGE ──────────────────

  describe("Section structure (#7)", () => {
    test("every section has a session_key", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Section WHERE session_key IS NULL OR session_key = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every section references an existing session", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM Section sec
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sec.session_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("every section has a title", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Section WHERE title IS NULL OR TRIM(title) = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("sections are properly ordered within their sessions", () => {
      // Check that no session has duplicate ordinals
      const { dupes } = db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT session_key, ordinal, COUNT(*) as cnt
             FROM Section
             GROUP BY session_key, ordinal
             HAVING cnt > 1
           )`,
        )
        .get() as any;
      expect(dupes).toBe(0);
    });
  });

  // ─── ISSUE #7: PARLIAMENT SIZE NEVER EXCEEDS 200 ──────────

  describe("Parliament size (#7)", () => {
    test("number of active MPs never exceeds 200 on any session date", () => {
      // Check parliament size on each session date
      const oversized = db
        .query(
          `SELECT s.date, COUNT(DISTINCT r.person_id) as mp_count
           FROM Session s
           JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
           JOIN Representative r ON r.person_id = t.person_id
           WHERE NOT EXISTS (
             SELECT 1 FROM TemporaryAbsence ta
             WHERE ta.person_id = r.person_id
               AND ta.start_date <= s.date
               AND (ta.end_date IS NULL OR ta.end_date >= s.date)
           )
           GROUP BY s.date
           HAVING mp_count > 200`,
        )
        .all() as any[];
      expect(oversized).toHaveLength(0);
    });
  });

  // ─── ISSUE #7: VOTING COUNTS ──────────────────────────────

  describe("Voting counts (#7)", () => {
    test("n_total never exceeds 200", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Voting WHERE n_total > 200")
        .get() as any;
      expect(c).toBe(0);
    });

    test("individual vote count per voting never exceeds 200", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM (
             SELECT voting_id, COUNT(*) as vote_cnt
             FROM Vote
             GROUP BY voting_id
             HAVING vote_cnt > 200
           )`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("vote counts are non-negative", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Voting
           WHERE n_yes < 0 OR n_no < 0 OR n_abstain < 0 OR n_absent < 0`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("n_yes + n_no + n_abstain + n_absent = n_total", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Voting
           WHERE n_total > 0
             AND n_yes + n_no + n_abstain + n_absent != n_total`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("individual vote count matches n_total for each voting", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM (
             SELECT v.id, v.n_total, COUNT(vo.id) as actual_votes
             FROM Voting v
             JOIN Vote vo ON v.id = vo.voting_id
             GROUP BY v.id
             HAVING actual_votes != v.n_total
           )`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no votings with NULL start_time", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Voting WHERE start_time IS NULL",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no duplicate voting numbers within a session", () => {
      const { dupes } = db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT session_key, number, COUNT(*) as cnt
             FROM Voting
             WHERE session_key != ''
             GROUP BY session_key, number
             HAVING cnt > 1
           )`,
        )
        .get() as any;
      expect(dupes).toBe(0);
    });
  });

  // ─── ISSUE #7: VOTINGS LINKED TO SESSIONS ────────────────

  describe("Voting → Session linkage (#7)", () => {
    test("every voting has a non-empty session_key", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Voting WHERE session_key IS NULL OR session_key = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every voting references an existing session", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM Voting v
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = v.session_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });
  });

  // ─── VOTE INTEGRITY ───────────────────────────────────────

  describe("Vote integrity", () => {
    test("vote values are only valid Finnish values (Jaa, Ei, Tyhjää, Poissa)", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', 'Tyhjää', 'Poissa')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every vote references an existing voting", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM Vote vo
           WHERE NOT EXISTS (SELECT 1 FROM Voting v WHERE v.id = vo.voting_id)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("every vote references an existing representative", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM Vote vo
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = vo.person_id)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("no duplicate votes (same person voting twice in same voting)", () => {
      const { dupes } = db
        .query(
          `SELECT COUNT(*) as dupes FROM (
             SELECT voting_id, person_id, COUNT(*) as cnt
             FROM Vote
             GROUP BY voting_id, person_id
             HAVING cnt > 1
           )`,
        )
        .get() as any;
      expect(dupes).toBe(0);
    });
  });

  // ─── REPRESENTATIVE DATA INTEGRITY ─────────────────────────

  describe("Representative data integrity", () => {
    test("birth dates are plausible (after 1830, parliament founded 1907)", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE birth_date IS NOT NULL AND birth_date < '1830-01-01'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("birth dates are not in the future", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE birth_date IS NOT NULL AND birth_date > DATE('now')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("gender values are only 'Mies' or 'Nainen'", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Representative
           WHERE gender IS NOT NULL AND gender NOT IN ('Mies', 'Nainen')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("gender distribution is plausible (both >100)", () => {
      const genders = db
        .query(
          "SELECT gender, COUNT(*) as c FROM Representative GROUP BY gender",
        )
        .all() as any[];
      const male = genders.find((g: any) => g.gender === "Mies");
      const female = genders.find((g: any) => g.gender === "Nainen");
      expect(male).toBeDefined();
      expect(female).toBeDefined();
      expect(male.c).toBeGreaterThan(100);
      expect(female.c).toBeGreaterThan(100);
    });

    test("every representative has at least one term", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Representative r
           WHERE NOT EXISTS (SELECT 1 FROM Term t WHERE t.person_id = r.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── TERM INTEGRITY ────────────────────────────────────────

  describe("Term integrity", () => {
    test("term start_date <= end_date", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Term
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no overlapping terms for the same person", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Term t1
           JOIN Term t2 ON t1.person_id = t2.person_id AND t1.id < t2.id
           WHERE t1.end_date IS NOT NULL
             AND t2.start_date < t1.end_date`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every term references an existing representative", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Term t
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = t.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── PARLIAMENTARY GROUP INTEGRITY ─────────────────────────

  describe("Parliamentary group integrity", () => {
    test("group membership start_date <= end_date", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM ParliamentaryGroupMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no overlapping group memberships in different groups for same person", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM ParliamentaryGroupMembership pgm1
           JOIN ParliamentaryGroupMembership pgm2
             ON pgm1.person_id = pgm2.person_id AND pgm1.id < pgm2.id
           WHERE pgm1.group_name != pgm2.group_name
             AND pgm1.start_date <= COALESCE(pgm2.end_date, '9999-12-31')
             AND pgm2.start_date <= COALESCE(pgm1.end_date, '9999-12-31')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all group memberships reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM ParliamentaryGroupMembership pgm
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = pgm.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all group memberships reference existing groups", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM ParliamentaryGroupMembership pgm
           WHERE NOT EXISTS (SELECT 1 FROM ParliamentaryGroup pg WHERE pg.code = pgm.group_code)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── SPEECH INTEGRITY ─────────────────────────────────────

  describe("Speech integrity", () => {
    test("every speech has a session_key", () => {
      const { c } = db
        .query(
          "SELECT COUNT(*) as c FROM Speech WHERE session_key IS NULL OR session_key = ''",
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("every speech references an existing session", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM Speech sp
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sp.session_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });
  });

  // ─── REFERENTIAL INTEGRITY (OTHER) ────────────────────────

  describe("Referential integrity", () => {
    test("all session agenda_keys reference existing agendas", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Session s
           WHERE s.agenda_key IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM Agenda a WHERE a.key = s.agenda_key)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all government memberships reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM GovernmentMembership gm
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = gm.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all committee memberships reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM CommitteeMembership cm
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = cm.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all representative districts reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RepresentativeDistrict rd
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = rd.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all representative districts reference existing districts", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RepresentativeDistrict rd
           WHERE NOT EXISTS (SELECT 1 FROM District d WHERE d.code = rd.district_code)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── SCHEMA INTEGRITY ─────────────────────────────────────

  describe("Schema integrity", () => {
    test("performance indexes exist", () => {
      const indexes = db
        .query(
          "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
        )
        .all() as { name: string }[];
      const indexNames = indexes.map((i) => i.name);

      expect(indexNames).toContain("idx_voting_start_time");
      expect(indexNames).toContain("idx_vote_person_voting");
      expect(indexNames).toContain("idx_vote_voting_id");
      expect(indexNames).toContain("idx_pgm_person_dates");
      expect(indexNames).toContain("idx_gm_government");
      expect(indexNames).toContain("idx_term_person_dates");
      expect(indexNames).toContain("idx_representative_gender");
      expect(indexNames).toContain("idx_representative_birth_date");
    });
  });

  // ─── QUERY CORRECTNESS ────────────────────────────────────

  describe("Query correctness", () => {
    test("pagination returns correct page sizes with no overlap", () => {
      const page1 = db
        .query("SELECT person_id FROM Representative LIMIT $limit OFFSET $offset")
        .all({ $limit: 25, $offset: 0 }) as any[];
      const page2 = db
        .query("SELECT person_id FROM Representative LIMIT $limit OFFSET $offset")
        .all({ $limit: 25, $offset: 25 }) as any[];

      expect(page1).toHaveLength(25);
      expect(page2).toHaveLength(25);

      const page1Ids = new Set(page1.map((r: any) => r.person_id));
      for (const r of page2) {
        expect(page1Ids.has(r.person_id)).toBe(false);
      }
    });

    test("sections within sessions are ordered by ordinal", () => {
      const session = db
        .query(
          `SELECT session_key FROM Section
           GROUP BY session_key HAVING COUNT(*) > 5 LIMIT 1`,
        )
        .get() as any;

      if (session) {
        const sections = db
          .query(
            "SELECT ordinal FROM Section WHERE session_key = ? ORDER BY ordinal ASC",
          )
          .all(session.session_key) as any[];

        for (let i = 1; i < sections.length; i++) {
          expect(sections[i].ordinal).toBeGreaterThanOrEqual(
            sections[i - 1].ordinal,
          );
        }
      }
    });
  });
});

import { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { existsSync } from "node:fs";
import { join } from "node:path";
import * as queries from "../database/queries";
import { EXPECTED_SANITY_TABLES } from "../database/sanity-queries";
import {
  buildKnownDataExceptions,
  getExceptionIdSetForCheck,
  getExceptionsForCheck,
  type KnownDataException,
} from "../services/known-data-exceptions";

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
let knownExceptions: KnownDataException[] = [];

const addDays = (isoDate: string, days: number) => {
  const [year, month, day] = isoDate.split("-").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const toEndDateExclusive = (endDate: string | null) =>
  endDate ? addDays(endDate, 1) : null;

const todayIso = new Date().toISOString().slice(0, 10);

interface OfficialGovernmentReference {
  name: string;
  startDate: string;
  endDate: string | null;
}

/**
 * Reference data source:
 * - https://valtioneuvosto.fi/hallitukset-ja-ministerit/hallitukset
 * - Orpo: https://valtioneuvosto.fi/hallitukset-ja-ministerit/hallitukset/-/gov/orpo
 * - Marin: https://valtioneuvosto.fi/hallitukset-ja-ministerit/hallitukset/-/gov/marin
 * - Sipilä: https://valtioneuvosto.fi/hallitukset-ja-ministerit/hallitukset/-/gov/sipila
 */
const parseFiDate = (value: string) => {
  const [day, month, year] = value.split(".").map((part) => Number(part));
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.toISOString().slice(0, 10);
};

const OFFICIAL_GOVERNMENTS_RAW = `
Orpo|20.6.2023|
Marin|10.12.2019|20.6.2023
Rinne|6.6.2019|10.12.2019
Sipilä|29.5.2015|6.6.2019
Stubb|24.6.2014|29.5.2015
Katainen|22.6.2011|24.6.2014
Kiviniemi|22.6.2010|22.6.2011
Vanhanen II|19.4.2007|22.6.2010
Vanhanen|24.6.2003|19.4.2007
Jäätteenmäki|17.4.2003|24.6.2003
Lipponen II|15.4.1999|17.4.2003
Lipponen|13.4.1995|15.4.1999
Aho|26.4.1991|13.4.1995
Holkeri|30.4.1987|26.4.1991
Sorsa IV|6.5.1983|30.4.1987
Sorsa III|19.2.1982|6.5.1983
Koivisto II|26.5.1979|19.2.1982
Sorsa II|15.5.1977|26.5.1979
Miettunen III|29.9.1976|15.5.1977
Miettunen II|30.11.1975|29.9.1976
Liinamaa|13.6.1975|30.11.1975
Sorsa|4.9.1972|13.6.1975
Paasio II|23.2.1972|4.9.1972
Aura II|29.10.1971|23.2.1972
Karjalainen II|15.7.1970|29.10.1971
Aura|14.5.1970|15.7.1970
Koivisto|22.3.1968|14.5.1970
Paasio|27.5.1966|22.3.1968
Virolainen|12.9.1964|27.5.1966
Lehto|18.12.1963|12.9.1964
Karjalainen|13.4.1962|18.12.1963
Miettunen|14.7.1961|13.4.1962
Sukselainen II|13.1.1959|14.7.1961
Fagerholm III|29.8.1958|13.1.1959
Kuuskoski|26.4.1958|29.8.1958
von Fieandt|29.11.1957|26.4.1958
Sukselainen|27.5.1957|29.11.1957
Fagerholm II|3.3.1956|27.5.1957
Kekkonen V|20.10.1954|3.3.1956
Törngren|5.5.1954|20.10.1954
Tuomioja|17.11.1953|5.5.1954
Kekkonen IV|9.7.1953|17.11.1953
Kekkonen III|20.9.1951|9.7.1953
Kekkonen II|17.1.1951|20.9.1951
Kekkonen|17.3.1950|17.1.1951
Fagerholm|29.7.1948|17.3.1950
Pekkala|26.3.1946|29.7.1948
Paasikivi III|17.4.1945|26.3.1946
Paasikivi II|17.11.1944|17.4.1945
Castren U.|21.9.1944|17.11.1944
Hackzell|8.8.1944|21.9.1944
Linkomies|5.3.1943|8.8.1944
Rangell|4.1.1941|5.3.1943
Ryti II|27.3.1940|4.1.1941
Ryti|1.12.1939|27.3.1940
Cajander III|12.3.1937|1.12.1939
Kallio IV|7.10.1936|12.3.1937
Kivimäki|14.12.1932|7.10.1936
Sunila II|21.3.1931|14.12.1932
Svinhufvud II|4.7.1930|21.3.1931
Kallio III|16.8.1929|4.7.1930
Mantere|22.12.1928|16.8.1929
Sunila|17.12.1927|22.12.1928
Tanner|13.12.1926|17.12.1927
Kallio II|31.12.1925|13.12.1926
Tulenheimo|31.3.1925|31.12.1925
Ingman II|31.5.1924|31.3.1925
Cajander II|18.1.1924|31.5.1924
Kallio|14.11.1922|18.1.1924
Cajander|2.6.1922|14.11.1922
Vennola II|9.4.1921|2.6.1922
Erich|15.3.1920|9.4.1921
Vennola|15.8.1919|15.3.1920
Castren K.|17.4.1919|15.8.1919
Ingman|27.11.1918|17.4.1919
Paasikivi|27.5.1918|27.11.1918
Svinhufvud|27.11.1917|27.5.1918
`.trim();

const OFFICIAL_GOVERNMENT_REFERENCES: OfficialGovernmentReference[] =
  OFFICIAL_GOVERNMENTS_RAW.split("\n").map((line) => {
    const [name, startFi, endFi] = line.split("|");
    return {
      name,
      startDate: parseFiDate(startFi),
      endDate: endFi ? parseFiDate(endFi) : null,
    };
  });

const GOVERNMENT_NAME_ALIASES: Record<string, string> = {
  Lipponen: "Lipponen I",
};

const resolveDbGovernmentName = (officialName: string) =>
  GOVERNMENT_NAME_ALIASES[officialName] || officialName;

// Documented in /GOVERNMENT_DATA_EXCEPTIONS.md
const KNOWN_GOVERNMENT_RANGE_MISMATCHES = new Set([
  "von Fieandt",
  "Kekkonen IV",
  "Kekkonen",
  "Paasikivi III",
  "Kallio IV",
  "Kallio II",
  "Ingman",
]);

// Documented in /GOVERNMENT_DATA_EXCEPTIONS.md
const KNOWN_PARTY_SUMMARY_NO_COALITION = new Set([
  "Aura II",
  "Aura",
  "Lehto",
  "von Fieandt",
  "Cajander",
]);

function expectIdsExplainedByKnownException(
  checkName: string,
  actualIds: Array<number | string>,
) {
  const expectedIds = getExceptionIdSetForCheck(knownExceptions, checkName);
  const actualIdSet = new Set(actualIds.map((id) => String(id)));

  const unexpectedIds = [...actualIdSet].filter((id) => !expectedIds.has(id));
  const missingKnownIds = [...expectedIds].filter((id) => !actualIdSet.has(id));

  if (unexpectedIds.length > 0 || missingKnownIds.length > 0) {
    const checkExceptions = getExceptionsForCheck(knownExceptions, checkName);
    console.log(
      `[known-exception-mismatch] check=${checkName}, registered_exception_count=${checkExceptions.length}, unexpected_ids=${unexpectedIds.slice(0, 20).join(",")}, missing_known_ids=${missingKnownIds.slice(0, 20).join(",")}`,
    );
  }

  expect(unexpectedIds).toEqual([]);
  expect(missingKnownIds).toEqual([]);
}

beforeAll(() => {
  if (!DB_EXISTS) return;
  db = new Database(DB_PATH, { readonly: true });
  db.exec("PRAGMA journal_mode = WAL;");
  knownExceptions = buildKnownDataExceptions(db);
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

      for (const expected of EXPECTED_SANITY_TABLES) {
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
      const { c } = db.query("SELECT COUNT(*) as c FROM Session").get() as any;
      expect(c).toBeGreaterThan(100);
    });

    test("Voting table has >1000 votings", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM Voting").get() as any;
      expect(c).toBeGreaterThan(1000);
    });

    test("Vote table has individual vote records", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM Vote").get() as any;
      expect(c).toBeGreaterThan(100000);
    });

    test("Section table has >1000 sections", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM Section").get() as any;
      expect(c).toBeGreaterThan(1000);
    });

    test("Speech table has >10000 speeches", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM Speech").get() as any;
      expect(c).toBeGreaterThan(10000);
    });

    test("Term table has >1000 terms", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM Term").get() as any;
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
      const mismatchedRows = db
        .query(
          `SELECT v.id
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING COUNT(vo.id) != v.n_total`,
        )
        .all() as Array<{ id: number }>;
      const mismatchedIds = mismatchedRows.map((row) => row.id);
      expectIdsExplainedByKnownException(
        "Individual vote count matches",
        mismatchedIds,
      );
    });

    test("no votings with NULL start_time", () => {
      const { c } = db
        .query("SELECT COUNT(*) as c FROM Voting WHERE start_time IS NULL")
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

  // ─── SALIDB LINKAGE ──────────────────────────────────────

  describe("SaliDB linkage", () => {
    test("SectionDocumentLink references existing Section", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM SectionDocumentLink sdl
           WHERE NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = sdl.section_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("SessionNotice references existing Session", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM SessionNotice sn
           WHERE NOT EXISTS (SELECT 1 FROM Session s WHERE s.key = sn.session_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("SessionNotice.section_key references existing Section", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM SessionNotice sn
           WHERE sn.section_key IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = sn.section_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("SaliDBDocumentReference references existing Voting when voting_id is set", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM SaliDBDocumentReference dr
           WHERE dr.voting_id IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM Voting v WHERE v.id = dr.voting_id)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("SaliDBDocumentReference references existing Section when section_key is set", () => {
      const { orphans } = db
        .query(
          `SELECT COUNT(*) as orphans FROM SaliDBDocumentReference dr
           WHERE dr.section_key IS NOT NULL
             AND NOT EXISTS (SELECT 1 FROM Section s WHERE s.key = dr.section_key)`,
        )
        .get() as any;
      expect(orphans).toBe(0);
    });

    test("SaliDBDocumentReference has a basic tunnus format", () => {
      const { bad } = db
        .query(
          `SELECT COUNT(*) as bad FROM SaliDBDocumentReference
           WHERE document_tunnus NOT LIKE '%/%'`,
        )
        .get() as any;
      expect(bad).toBe(0);
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

  // ─── VOTE AGGREGATION PER TYPE ────────────────────────────

  describe("Vote aggregation per type", () => {
    test("per-type vote counts match individual vote records", () => {
      const mismatchedRows = db
        .query(
          `SELECT v.id
           FROM Voting v
           JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING SUM(CASE WHEN vo.vote = 'Jaa' THEN 1 ELSE 0 END) != v.n_yes
              OR SUM(CASE WHEN vo.vote = 'Ei' THEN 1 ELSE 0 END) != v.n_no
              OR SUM(CASE WHEN vo.vote = 'Tyhjää' THEN 1 ELSE 0 END) != v.n_abstain
              OR SUM(CASE WHEN vo.vote = 'Poissa' THEN 1 ELSE 0 END) != v.n_absent`,
        )
        .all() as Array<{ id: number }>;
      const mismatchedIds = mismatchedRows.map((row) => row.id);
      expectIdsExplainedByKnownException(
        "Vote aggregation per type",
        mismatchedIds,
      );
    });
  });

  // ─── VOTING TEMPORAL CONSISTENCY ────────────────────────────

  describe("Voting temporal consistency", () => {
    test("voting start_time is within 1 day of session date (sessions can span overnight)", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Voting v
           JOIN Session s ON s.key = v.session_key
           WHERE v.start_time IS NOT NULL
             AND s.date IS NOT NULL
             AND ABS(JULIANDAY(SUBSTR(v.start_time, 1, 10)) - JULIANDAY(s.date)) > 1`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── VOTING → SECTION LINKAGE ──────────────────────────────

  describe("Voting → Section linkage", () => {
    test("votings with section_key reference existing sections", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Voting v
           WHERE v.section_key IS NOT NULL AND v.section_key != ''
             AND NOT EXISTS (SELECT 1 FROM Section sec WHERE sec.key = v.section_key)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── COMMITTEE MEMBERSHIP DATE VALIDITY ─────────────────────

  describe("Committee membership integrity", () => {
    test("committee membership start_date <= end_date", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM CommitteeMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── GOVERNMENT MEMBERSHIP INTEGRITY ────────────────────────

  describe("Government membership integrity", () => {
    test("government membership start_date <= end_date", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all government memberships have a government name", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM GovernmentMembership
           WHERE government IS NULL OR TRIM(government) = ''`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── GOVERNMENT COMPOSITION REFERENCE CHECKS ───────────────

  describe("Government composition reference checks", () => {
    test("all official governments from valtioneuvosto exist with compatible names and ranges", () => {
      const valuesSql = OFFICIAL_GOVERNMENT_REFERENCES.map((row) => {
        const dbName = resolveDbGovernmentName(row.name).replaceAll("'", "''");
        const endDateSql = row.endDate ? `'${row.endDate}'` : "NULL";
        return `('${dbName}', '${row.startDate}', ${endDateSql})`;
      }).join(",\n");

      const mismatchRows = db
        .query(
          `WITH official(db_name, start_date, end_date) AS (
             VALUES ${valuesSql}
           ),
           aggregated AS (
             SELECT
               TRIM(government) AS government,
               MIN(start_date) AS start_date,
               CASE
                 WHEN SUM(CASE WHEN end_date IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
                 ELSE MAX(end_date)
               END AS end_date
             FROM GovernmentMembership
             WHERE government IS NOT NULL
               AND TRIM(government) <> ''
             GROUP BY TRIM(government)
           )
           SELECT
             o.db_name,
             o.start_date AS official_start,
             o.end_date AS official_end,
             a.start_date AS db_start,
             a.end_date AS db_end
           FROM official o
           LEFT JOIN aggregated a ON a.government = o.db_name
           WHERE a.government IS NULL
             OR NOT (
               (
                 a.start_date = o.start_date
                 OR ABS(JULIANDAY(a.start_date) - JULIANDAY(o.start_date)) <= 1
                 OR (
                   SUBSTR(a.start_date, 6, 5) IN ('01-01', '12-31')
                   AND SUBSTR(a.start_date, 1, 4) = SUBSTR(o.start_date, 1, 4)
                 )
               )
               AND
               (
                 (o.end_date IS NULL AND a.end_date IS NULL)
                 OR (
                   o.end_date IS NOT NULL
                   AND a.end_date IS NOT NULL
                   AND (
                     a.end_date = o.end_date
                     OR ABS(JULIANDAY(a.end_date) - JULIANDAY(o.end_date)) <= 1
                     OR (
                       SUBSTR(a.end_date, 6, 5) IN ('01-01', '12-31')
                       AND SUBSTR(a.end_date, 1, 4) = SUBSTR(o.end_date, 1, 4)
                     )
                   )
                 )
               )
             )`,
        )
        .all() as Array<{
        db_name: string;
        official_start: string;
        official_end: string | null;
        db_start: string | null;
        db_end: string | null;
      }>;

      const unexpectedMismatches = mismatchRows.filter(
        (row) => !KNOWN_GOVERNMENT_RANGE_MISMATCHES.has(row.db_name),
      );
      expect(unexpectedMismatches).toHaveLength(0);
    });

    test("PARTY_SUMMARY returns at least one coalition party for every official government", () => {
      const stmt = db.prepare(queries.partySummary);
      const governmentsWithNoCoalition: string[] = [];

      for (const expected of OFFICIAL_GOVERNMENT_REFERENCES) {
        const endDate = expected.endDate ?? todayIso;
        const candidateAsOf = addDays(endDate, -1);
        const asOfDate =
          candidateAsOf >= expected.startDate ? candidateAsOf : expected.startDate;
        const rows = stmt.all({
          $asOfDate: asOfDate,
          $startDate: expected.startDate,
          $endDateExclusive: toEndDateExclusive(expected.endDate),
          $governmentName: resolveDbGovernmentName(expected.name),
          $governmentStartDate: expected.startDate,
        }) as Array<{
          is_in_government: number;
        }>;

        const coalitionCount = rows.filter(
          (row) => row.is_in_government === 1,
        ).length;
        if (coalitionCount === 0) {
          governmentsWithNoCoalition.push(expected.name);
        }
      }

      stmt.finalize();

      const unexpectedNoCoalition = governmentsWithNoCoalition.filter(
        (name) => !KNOWN_PARTY_SUMMARY_NO_COALITION.has(name),
      );
      expect(unexpectedNoCoalition).toHaveLength(0);
    });

    test("every official government has minister role and ministry data", () => {
      for (const expected of OFFICIAL_GOVERNMENT_REFERENCES) {
        const windowEnd = expected.endDate ?? todayIso;
        const { role_count, ministry_count } = db
          .query(
            `SELECT
               SUM(CASE WHEN gm.name IS NOT NULL AND TRIM(gm.name) <> '' THEN 1 ELSE 0 END) AS role_count,
               SUM(CASE WHEN gm.ministry IS NOT NULL AND TRIM(gm.ministry) <> '' THEN 1 ELSE 0 END) AS ministry_count
             FROM GovernmentMembership gm
             WHERE TRIM(gm.government) = $governmentName
               AND gm.start_date <= $windowEnd
               AND (gm.end_date IS NULL OR gm.end_date >= $windowStart)`,
          )
          .get({
            $governmentName: resolveDbGovernmentName(expected.name),
            $windowStart: expected.startDate,
            $windowEnd: windowEnd,
          }) as { role_count: number | null; ministry_count: number | null };

        expect(role_count || 0).toBeGreaterThan(0);
        expect(ministry_count || 0).toBeGreaterThan(0);
      }
    });
  });

  // ─── DISTRICT INTEGRITY ─────────────────────────────────────

  describe("District integrity", () => {
    test("district count is plausible (10-50, includes historical districts since 1907)", () => {
      const { c } = db.query("SELECT COUNT(*) as c FROM District").get() as any;
      expect(c).toBeGreaterThanOrEqual(10);
      expect(c).toBeLessThanOrEqual(50);
    });

    test("no overlapping district assignments for same representative", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM RepresentativeDistrict rd1
           JOIN RepresentativeDistrict rd2
             ON rd1.person_id = rd2.person_id AND rd1.id < rd2.id
           WHERE rd1.district_code != rd2.district_code
             AND rd1.start_date <= COALESCE(rd2.end_date, '9999-12-31')
             AND rd2.start_date <= COALESCE(rd1.end_date, '9999-12-31')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── AUXILIARY TABLE REFERENTIAL INTEGRITY ──────────────────

  describe("Auxiliary table referential integrity", () => {
    test("all education records reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Education e
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = e.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all work history records reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM WorkHistory w
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = w.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("all trust position records reference existing representatives", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM TrustPosition tp
           WHERE NOT EXISTS (SELECT 1 FROM Representative r WHERE r.person_id = tp.person_id)`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── SESSION DATE PLAUSIBILITY ──────────────────────────────

  describe("Session date plausibility", () => {
    test("no session dates before 1907 (parliament founded)", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date < '1907-01-01'`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("no future session dates", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM Session
           WHERE date IS NOT NULL AND date > DATE('now')`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── PARLIAMENTARY GROUP MEMBERSHIP CHECKS ─────────────────

  describe("Parliamentary group membership completeness", () => {
    test("every active MP has a parliamentary group membership", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM (
             SELECT DISTINCT s.date, t.person_id
             FROM Session s
             JOIN Term t ON t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
             WHERE NOT EXISTS (
               SELECT 1 FROM TemporaryAbsence ta
               WHERE ta.person_id = t.person_id
                 AND ta.start_date <= s.date
                 AND (ta.end_date IS NULL OR ta.end_date >= s.date)
             )
             AND NOT EXISTS (
               SELECT 1 FROM ParliamentaryGroupMembership pgm
               WHERE pgm.person_id = t.person_id
                 AND pgm.start_date <= s.date
                 AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
             )
           )`,
        )
        .get() as any;
      expect(c).toBe(0);
    });

    test("active group members count equals active parliament members count per date", () => {
      const { c } = db
        .query(
          `SELECT COUNT(*) as c FROM (
             SELECT s.date,
               (SELECT COUNT(DISTINCT t.person_id) FROM Term t
                WHERE t.start_date <= s.date AND (t.end_date IS NULL OR t.end_date >= s.date)
                AND NOT EXISTS (
                  SELECT 1 FROM TemporaryAbsence ta
                  WHERE ta.person_id = t.person_id
                    AND ta.start_date <= s.date
                    AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                )) as term_count,
               (SELECT COUNT(DISTINCT pgm.person_id) FROM ParliamentaryGroupMembership pgm
                WHERE pgm.start_date <= s.date AND (pgm.end_date IS NULL OR pgm.end_date >= s.date)
                AND NOT EXISTS (
                  SELECT 1 FROM TemporaryAbsence ta
                  WHERE ta.person_id = pgm.person_id
                    AND ta.start_date <= s.date
                    AND (ta.end_date IS NULL OR ta.end_date >= s.date)
                )) as group_count
             FROM Session s
             WHERE s.date IS NOT NULL
             GROUP BY s.date
             HAVING term_count != group_count
           )`,
        )
        .get() as any;
      expect(c).toBe(0);
    });
  });

  // ─── QUERY CORRECTNESS ────────────────────────────────────

  describe("Query correctness", () => {
    test("pagination returns correct page sizes with no overlap", () => {
      const page1 = db
        .query(
          "SELECT person_id FROM Representative LIMIT $limit OFFSET $offset",
        )
        .all({ $limit: 25, $offset: 0 }) as any[];
      const page2 = db
        .query(
          "SELECT person_id FROM Representative LIMIT $limit OFFSET $offset",
        )
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

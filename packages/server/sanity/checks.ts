import type { Database } from "bun:sqlite";
import type { SanityCheckDefinition } from "./types";

export const sanityChecks: SanityCheckDefinition[] = [
  // ── Business Logic ──────────────────────────────────────────────────────────

  {
    id: "parliament-size-max-200",
    category: "Business Logic",
    severity: "error",
    name: "Eduskunnan koko enintään 200",
    description:
      "Aktiivisten kansanedustajien määrä ei saa ylittää 200 minkään istunnon päivänä.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT s.date, COUNT(DISTINCT r.person_id) AS mp_count
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
        .all(),
  },

  {
    id: "parliament-size-exactly-200",
    category: "Business Logic",
    severity: "warning",
    name: "Eduskunnan koko täsmälleen 200",
    description:
      "Aktiivisten kansanedustajien määrän pitäisi olla tasan 200 jokaisena istuntopäivänä.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT s.date, COUNT(DISTINCT r.person_id) AS mp_count
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
           HAVING mp_count != 200`,
        )
        .all(),
  },

  {
    id: "no-future-sessions",
    category: "Business Logic",
    severity: "warning",
    name: "Ei tulevia istuntoja",
    description: "Istuntojen päivämäärät eivät saa olla tulevaisuudessa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT key, date FROM Session
           WHERE date IS NOT NULL AND date > DATE('now')`,
        )
        .all(),
  },

  {
    id: "sessions-after-1907",
    category: "Business Logic",
    severity: "error",
    name: "Istunnot vuodesta 1907 alkaen",
    description:
      "Suomen eduskunta perustettiin vuonna 1907 — aiempia istuntoja ei pitäisi olla.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT key, date FROM Session
           WHERE date IS NOT NULL AND date < '1907-01-01'`,
        )
        .all(),
  },

  // ── Data Quality ─────────────────────────────────────────────────────────────

  {
    id: "unique-person-ids",
    category: "Data Quality",
    severity: "error",
    name: "Uniikit henkilötunnisteet",
    description: "Jokaisella edustajalla tulee olla uniikki person_id.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT person_id, COUNT(*) AS count
           FROM Representative
           GROUP BY person_id
           HAVING count > 1`,
        )
        .all(),
  },

  {
    id: "complete-names",
    category: "Data Quality",
    severity: "error",
    name: "Täydelliset nimet",
    description: "Kaikilla edustajilla tulee olla etu- ja sukunimi.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT person_id, first_name, last_name
           FROM Representative
           WHERE first_name IS NULL OR last_name IS NULL
              OR TRIM(first_name) = '' OR TRIM(last_name) = ''`,
        )
        .all(),
  },

  {
    id: "valid-vote-values",
    category: "Data Quality",
    severity: "error",
    name: "Kelvollisia ääniarvoja",
    description: "Äänen arvo täytyy olla Jaa, Ei, Tyhjää tai Poissa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT DISTINCT vote FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', ('Tyhj' || char(228, 228)), 'Poissa')`,
        )
        .all(),
  },

  {
    id: "no-duplicate-votes",
    category: "Data Quality",
    severity: "error",
    name: "Ei kaksoissyöttöjä äänestyksissä",
    description: "Jokainen henkilö voi äänestää vain kerran per äänestys.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT voting_id, person_id, COUNT(*) AS vote_count
           FROM Vote
           GROUP BY voting_id, person_id
           HAVING vote_count > 1`,
        )
        .all(),
  },

  {
    id: "voting-total-max-200",
    category: "Data Quality",
    severity: "error",
    name: "Äänimäärä enintään 200",
    description: "Äänestyksen kokonaisäänimäärä ei saa ylittää 200.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key, number, n_total
           FROM Voting WHERE n_total > 200`,
        )
        .all(),
  },

  // ── Data Integrity ───────────────────────────────────────────────────────────

  {
    id: "term-dates-valid",
    category: "Data Integrity",
    severity: "error",
    name: "Toimikausien päivämäärät oikein",
    description: "Toimikauden alkupäivä ei saa olla loppupäivän jälkeen.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT person_id, start_date, end_date FROM Term
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .all(),
  },

  {
    id: "group-membership-dates-valid",
    category: "Data Integrity",
    severity: "error",
    name: "Puoluejäsenyyksien päivämäärät oikein",
    description: "Puoluejäsenyyden alkupäivä ei saa olla loppupäivän jälkeen.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT person_id, start_date, end_date FROM ParliamentaryGroupMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .all(),
  },

  {
    id: "group-membership-no-overlaps",
    category: "Data Integrity",
    severity: "error",
    name: "Puoluejäsenyydet eivät päälle",
    description:
      "Henkilöllä ei saa olla päällekkäisiä puoluejäsenyyksiä eri puolueisiin.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT a.person_id,
                  a.group_id AS group_a, a.start_date AS start_a, a.end_date AS end_a,
                  b.group_id AS group_b, b.start_date AS start_b, b.end_date AS end_b
           FROM ParliamentaryGroupMembership a
           JOIN ParliamentaryGroupMembership b
             ON a.person_id = b.person_id AND a.group_id < b.group_id
           WHERE a.start_date <= COALESCE(b.end_date, '9999-12-31')
             AND b.start_date <= COALESCE(a.end_date, '9999-12-31')`,
        )
        .all(),
  },

  {
    id: "government-membership-dates-valid",
    category: "Data Integrity",
    severity: "error",
    name: "Hallitusjäsenyyksien päivämäärät oikein",
    description:
      "Hallitusjäsenyyden alkupäivä ei saa olla loppupäivän jälkeen.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT government_id, person_id, start_date, end_date
           FROM GovernmentMembership
           WHERE end_date IS NOT NULL AND start_date > end_date`,
        )
        .all(),
  },

  {
    id: "government-dates-no-overlap",
    category: "Data Integrity",
    severity: "error",
    name: "Hallituskaudet eivät päälle",
    description: "Kaksi hallitusta ei saa olla samanaikaisesti aktiivisia.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT a.id AS gov_a, a.name AS name_a, a.start_date AS start_a, a.end_date AS end_a,
                  b.id AS gov_b, b.name AS name_b, b.start_date AS start_b, b.end_date AS end_b
           FROM Government a
           JOIN Government b ON a.id < b.id
           WHERE a.start_date <= COALESCE(b.end_date, '9999-12-31')
             AND b.start_date <= COALESCE(a.end_date, '9999-12-31')`,
        )
        .all(),
  },

  {
    id: "voting-count-sums",
    category: "Data Integrity",
    severity: "error",
    name: "Äänityyppien summa täsmää",
    description: "n_yes + n_no + n_abstain + n_absent täytyy olla n_total.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key, number, n_total, n_yes, n_no, n_abstain, n_absent
           FROM Voting
           WHERE n_total > 0
             AND n_yes + n_no + n_abstain + n_absent != n_total`,
        )
        .all(),
  },

  {
    id: "voting-individual-count-matches",
    category: "Data Integrity",
    severity: "error",
    name: "Yksittäisten äänien määrä täsmää",
    description: "Äänestysrivien lukumäärän täytyy vastata n_total-arvoa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT v.id, v.session_key, v.number, v.n_total, COUNT(vo.id) AS actual_votes
           FROM Voting v
           LEFT JOIN Vote vo ON v.id = vo.voting_id
           GROUP BY v.id
           HAVING actual_votes != COALESCE(v.n_total, 0)`,
        )
        .all(),
  },

  // ── Referential Integrity ────────────────────────────────────────────────────

  {
    id: "vote-representative-links",
    category: "Referential Integrity",
    severity: "error",
    name: "Äänestykset → Edustajat",
    description: "Kaikilla äänillä täytyy olla vastaava edustaja.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT DISTINCT vo.person_id
           FROM Vote vo
           WHERE NOT EXISTS (
             SELECT 1 FROM Representative r WHERE r.person_id = vo.person_id
           )`,
        )
        .all(),
  },

  {
    id: "section-session-links",
    category: "Referential Integrity",
    severity: "error",
    name: "Kohdat → Istunnot",
    description: "Kaikkien kohtien täytyy viitata olemassa olevaan istuntoon.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT sec.key, sec.session_key
           FROM Section sec
           WHERE NOT EXISTS (
             SELECT 1 FROM Session s WHERE s.key = sec.session_key
           )`,
        )
        .all(),
  },

  {
    id: "voting-session-links",
    category: "Referential Integrity",
    severity: "error",
    name: "Äänestykset → Istunnot",
    description:
      "Kaikkien äänestyssessioiden täytyy viitata olemassa olevaan istuntoon.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key FROM Voting
           WHERE NOT EXISTS (
             SELECT 1 FROM Session s WHERE s.key = session_key
           )`,
        )
        .all(),
  },

  {
    id: "representatives-have-terms",
    category: "Referential Integrity",
    severity: "error",
    name: "Edustajilla on toimikausia",
    description:
      "Jokaisella edustajalla täytyy olla vähintään yksi toimikausi.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT person_id, first_name, last_name FROM Representative r
           WHERE NOT EXISTS (
             SELECT 1 FROM Term t WHERE t.person_id = r.person_id
           )`,
        )
        .all(),
  },
];

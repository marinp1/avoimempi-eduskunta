import type { Database } from "bun:sqlite";
import type { SanityCheckDefinition } from "./quality.types";

/** Constitutional size of the Finnish parliament (PL 24 §). */
export const PARLIAMENT_SEATS = 200;

/**
 * First plenary of the 2015 electoral term. Voting.session_key matches
 * Session.key reliably only from here on: vote history starts 12.6.1996 but
 * session history starts 2.6.2014, and pre-April-2015 votings carry a legacy
 * plenary numbering (e.g. voting key 2014/66 vs Session keys like 2014/257)
 * that does not correspond to the Session table. Verified against the real
 * DB: zero unlinked votings from this date on.
 */
export const SESSION_LINKAGE_RELIABLE_FROM = "2015-04-22";

/**
 * Governments seated before 1987 were partly imported with year-precision
 * placeholder dates (YYYY-01-01 / YYYY-12-31), so day-level date arithmetic
 * on them is meaningless. From Holkeri (1987) on, all dates are exact.
 */
export const GOVERNMENT_DATES_RELIABLE_FROM = "1987-01-01";

const VACANCY_NOTES =
  "Lähdejärjestelmä laskee poissaoleviksi myös avoimet paikat: kun edustaja " +
  "kuolee tai eroaa, paikka lasketaan poissaolevaksi seuraajan aloitukseen " +
  "asti, mutta yksittäistä ääniriviä ei synny. Tunnetut tapaukset: Susanna " +
  "Haapojan paikka kesäkuussa 2009 (47 äänestystä) ja Ilkka Kanervan paikka " +
  "27.4.2022 (3 äänestystä). Tarkistus hyväksyy erotukset, jotka selittyvät " +
  "istuntopäivän avointen paikkojen määrällä — poikkeamarivin " +
  "vacant_seats-sarake kertoo avointen paikkojen määrän äänestyspäivänä " +
  "(200 − aktiiviset toimikaudet), joten selittämätön erotus näkyy suoraan " +
  "datasta.";

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
    id: "parliament-seat-vacancies",
    category: "Business Logic",
    severity: "info",
    name: "Avoimet edustajanpaikat istuntopäivinä",
    description:
      "Listaa istuntopäivät, joina aktiivisia kansanedustajia oli alle 200. Lyhyet vajaukset ovat normaaleja seuraajakatkoksia, eivät datavirheitä.",
    findingNotes:
      "Paikka on avoinna edustajan poistumisen ja seuraajan aloituksen välillä — tämä on eduskunnan normaalia toimintaa, ei datavirhe. Jokainen rivi näyttää todisteet suoraan datasta: vacant_seats on avointen paikkojen määrä, recent_departures paikan jättänyt edustaja (toimikauden päättymispäivä) ja next_seatings seuraava aloittaja (toimikauden alkupäivä). Esimerkki: Ilkka Kanerva kuoli 14.4.2022 ja Ville Valkonen aloitti 29.4.2022, joten 19.–28.4.2022 istuntopäivinä edustajia oli 199.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `WITH counts AS (
             SELECT s.date, COUNT(DISTINCT r.person_id) AS mp_count
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
             HAVING mp_count != ${PARLIAMENT_SEATS}
           )
           SELECT c.date, c.mp_count,
                  ${PARLIAMENT_SEATS} - c.mp_count AS vacant_seats,
                  (SELECT GROUP_CONCAT(r2.last_name || ' ' || r2.first_name || ' (' || t2.end_date || ')', '; ')
                   FROM Term t2
                   JOIN Representative r2 ON r2.person_id = t2.person_id
                   WHERE t2.end_date < c.date
                     AND t2.end_date >= DATE(c.date, '-21 days')
                     AND (SELECT COUNT(*) FROM Term tx WHERE tx.end_date = t2.end_date) <= 5
                     AND NOT EXISTS (
                       SELECT 1 FROM Term t3
                       WHERE t3.person_id = t2.person_id
                         AND t3.start_date <= c.date
                         AND (t3.end_date IS NULL OR t3.end_date >= c.date)
                     )
                  ) AS recent_departures,
                  (SELECT GROUP_CONCAT(r2.last_name || ' ' || r2.first_name || ' (' || t2.start_date || ')', '; ')
                   FROM Term t2
                   JOIN Representative r2 ON r2.person_id = t2.person_id
                   WHERE t2.start_date > c.date
                     AND t2.start_date <= DATE(c.date, '+60 days')
                     AND (SELECT COUNT(*) FROM Term tx WHERE tx.start_date = t2.start_date) <= 5
                  ) AS next_seatings
           FROM counts c`,
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
    id: "no-future-votings",
    category: "Business Logic",
    severity: "warning",
    name: "Ei tulevia äänestyksiä",
    description: "Äänestysten päivämäärät eivät saa olla tulevaisuudessa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key, number, start_time FROM Voting
           WHERE start_time IS NOT NULL AND DATE(start_time) > DATE('now')`,
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

  {
    id: "vote-group-abbreviation-trimmed",
    category: "Data Quality",
    severity: "warning",
    name: "Äänien ryhmätunnukset ilman reunavälilyöntejä",
    description:
      "Vote.group_abbreviation-arvon tulee olla valmiiksi trimmattu ilman alku- tai loppuvälilyöntejä.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, voting_id, person_id, group_abbreviation
           FROM Vote
           WHERE group_abbreviation IS NOT NULL
             AND group_abbreviation != TRIM(group_abbreviation)`,
        )
        .all(),
  },

  {
    id: "speech-party-abbreviation-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Puoluekoodi puuttuu NULL-arvona",
    description:
      "Speech.party_abbreviation-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, key, party_abbreviation
           FROM Speech
           WHERE party_abbreviation = ''`,
        )
        .all(),
  },

  {
    id: "speech-ministry-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Ministeriö puuttuu NULL-arvona",
    description:
      "Speech.ministry-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, key, ministry
           FROM Speech
           WHERE ministry = ''`,
        )
        .all(),
  },

  {
    id: "section-note-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Kohtahuomautus puuttuu NULL-arvona",
    description:
      "Section.note-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT key, note
           FROM Section
           WHERE note = ''`,
        )
        .all(),
  },

  {
    id: "section-processing-title-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Käsittelyotsikko puuttuu NULL-arvona",
    description:
      "Section.processing_title-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT key, processing_title
           FROM Section
           WHERE processing_title = ''`,
        )
        .all(),
  },

  {
    id: "section-resolution-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Päätöslauselma puuttuu NULL-arvona",
    description:
      "Section.resolution-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT key, resolution
           FROM Section
           WHERE resolution = ''`,
        )
        .all(),
  },

  {
    id: "voting-title-null-not-empty",
    category: "Data Quality",
    severity: "warning",
    name: "Äänestyksen otsikko puuttuu NULL-arvona",
    description:
      "Voting.title-kentässä puuttuva arvo pitää tallentaa NULL-arvona, ei tyhjänä merkkijonona.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key, number, title
           FROM Voting
           WHERE title = ''`,
        )
        .all(),
  },

  {
    id: "vote-group-abbreviation-lowercase",
    category: "Data Quality",
    severity: "warning",
    name: "Äänien ryhmätunnukset pienaakkosin",
    description:
      "Vote.group_abbreviation-arvojen tulee olla normalisoitu pienaakkosiin.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, voting_id, person_id, group_abbreviation
           FROM Vote
           WHERE group_abbreviation IS NOT NULL
             AND group_abbreviation != LOWER(group_abbreviation)`,
        )
        .all(),
  },

  {
    id: "speech-party-abbreviation-lowercase",
    category: "Data Quality",
    severity: "warning",
    name: "Puheenvuorojen puoluekoodit pienaakkosin",
    description:
      "Speech.party_abbreviation-arvojen tulee olla normalisoitu pienaakkosiin.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, key, party_abbreviation
           FROM Speech
           WHERE party_abbreviation IS NOT NULL
             AND party_abbreviation != ''
             AND party_abbreviation != LOWER(party_abbreviation)`,
        )
        .all(),
  },

  {
    id: "roll-call-entry-party-lowercase",
    category: "Data Quality",
    severity: "warning",
    name: "Nimenhuutopuolueet pienaakkosin",
    description:
      "RollCallEntry.party-arvojen tulee olla normalisoitu pienaakkosiin.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT roll_call_id, entry_order, person_id, party
           FROM RollCallEntry
           WHERE party IS NOT NULL
             AND party != LOWER(party)`,
        )
        .all(),
  },

  {
    id: "vaski-document-type-normalized",
    category: "Data Quality",
    severity: "warning",
    name: "Vaski-asiakirjatyypit normalisoitu",
    description:
      "VaskiDocument.document_type-arvon tulee olla normalisoitu pienaakkosinen tunniste (ei tyhjä, ei välilyöntejä). Taulu sisältää kymmeniä laillisia tyyppejä, joten kiinteää sallittujen arvojen listaa ei käytetä.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, document_type, edk_identifier, source_path
           FROM VaskiDocument
           WHERE document_type IS NULL
              OR TRIM(document_type) = ''
              OR document_type != LOWER(document_type)
              OR document_type LIKE '% %'`,
        )
        .all(),
  },

  {
    id: "roll-call-entry-names-present",
    category: "Data Quality",
    severity: "warning",
    name: "Nimenhuutoriveillä on nimet",
    description:
      "RollCallEntry.first_name- ja last_name-kenttien tulee sisältää arvo, ei NULL- tai tyhjää merkkijonoa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT roll_call_id, entry_order, person_id, first_name, last_name
           FROM RollCallEntry
           WHERE first_name IS NULL OR TRIM(first_name) = ''
              OR last_name IS NULL OR TRIM(last_name) = ''`,
        )
        .all(),
  },

  {
    id: "roll-call-entry-names-trimmed",
    category: "Data Quality",
    severity: "warning",
    name: "Nimenhuutorivien nimet trimmattuja",
    description:
      "RollCallEntry.first_name- ja last_name-arvoissa ei saa olla alku- tai loppuvälilyöntejä.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT roll_call_id, entry_order, person_id, first_name, last_name
           FROM RollCallEntry
           WHERE first_name != TRIM(first_name)
              OR last_name != TRIM(last_name)`,
        )
        .all(),
  },

  {
    id: "vote-values-normalized",
    category: "Data Quality",
    severity: "warning",
    name: "Ääniarvot normalisoitu",
    description:
      "Vote.vote-kentän arvon tulee olla Jaa, Ei, Tyhjää tai Poissa; lähdekielen arvoja ei saa jäädä tietokantaan.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, voting_id, person_id, vote
           FROM Vote
           WHERE vote NOT IN ('Jaa', 'Ei', ('Tyhj' || char(228, 228)), 'Poissa')`,
        )
        .all(),
  },

  {
    id: "roll-call-report-status-known-values",
    category: "Data Quality",
    severity: "warning",
    name: "Nimenhuutoraportin tila tunnetuissa arvoissa",
    description:
      "RollCallReport.status-kentässä saa olla vain tunnettuja lähdearvoja silloin kun arvo on asetettu.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, edk_identifier, status
           FROM RollCallReport
           WHERE status IS NOT NULL
             AND status NOT IN ('5', '8')`,
        )
        .all(),
  },

  {
    id: "vaski-document-source-path-present",
    category: "Data Quality",
    severity: "warning",
    name: "Vaski-asiakirjoilla on lähdepolku",
    description:
      "VaskiDocument.source_path-kentän tulee sisältää ei-tyhjä lähdepolku.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, document_type, edk_identifier, source_path
           FROM VaskiDocument
           WHERE source_path IS NULL OR TRIM(source_path) = ''`,
        )
        .all(),
  },

  {
    id: "speech-content-source-path-present",
    category: "Data Quality",
    severity: "warning",
    name: "Puhesisällöillä on lähdepolku",
    description:
      "SpeechContent.source_path-kentän tulee sisältää ei-tyhjä lähdepolku.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT speech_id, session_key, section_key, source_path
           FROM SpeechContent
           WHERE source_path IS NULL OR TRIM(source_path) = ''`,
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
                  a.group_code AS group_a, a.start_date AS start_a, a.end_date AS end_a,
                  b.group_code AS group_b, b.start_date AS start_b, b.end_date AS end_b
           FROM ParliamentaryGroupMembership a
           JOIN ParliamentaryGroupMembership b
             ON a.person_id = b.person_id AND a.group_code < b.group_code
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
    name: "Hallituskaudet eivät päällekkäin (1987 alkaen)",
    description:
      "Kaksi hallitusta ei saa olla samanaikaisesti aktiivisia. Saman päivän vaihdokset (eroava hallitus päättyy uuden alkaessa) ovat normaaleja, ja vuotta 1987 vanhempia hallituksia ei tarkisteta päivämäärien vuositarkkuuden vuoksi.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT a.id AS gov_a, a.name AS name_a, a.start_date AS start_a, a.end_date AS end_a,
                  b.id AS gov_b, b.name AS name_b, b.start_date AS start_b, b.end_date AS end_b
           FROM Government a
           JOIN Government b ON a.id < b.id
           WHERE a.start_date >= '${GOVERNMENT_DATES_RELIABLE_FROM}'
             AND b.start_date >= '${GOVERNMENT_DATES_RELIABLE_FROM}'
             AND a.start_date < COALESCE(b.end_date, '9999-12-31')
             AND b.start_date < COALESCE(a.end_date, '9999-12-31')`,
        )
        .all(),
  },

  {
    id: "government-dates-precision",
    category: "Data Integrity",
    severity: "info",
    name: "Hallituskausien päivämäärätarkkuus",
    description:
      "Listaa hallitukset, joiden alku- tai loppupäivä on tuotu vain vuoden tarkkuudella (paikkamerkit VVVV-01-01 / VVVV-12-31).",
    findingNotes:
      "21 hallituksella 77:stä (kaikki aloittaneet viimeistään 1983) päivämäärät on tuotu lähdedatasta vain vuoden tarkkuudella ja tallennettu muodossa VVVV-01-01 / VVVV-12-31. Päivätason vertailut eivät ole näille riveille mielekkäitä — siksi hallituskausien päällekkäisyystarkistus kattaa vain hallitukset vuodesta 1987 alkaen.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, name, start_date, end_date FROM Government
           WHERE start_date LIKE '%-01-01'
              OR COALESCE(end_date, '') LIKE '%-12-31'`,
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
    description:
      "Äänestysrivien lukumäärän täytyy vastata n_total-arvoa, istuntopäivän avoimet edustajanpaikat huomioiden.",
    findingNotes: VACANCY_NOTES,
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `WITH mism AS (
             SELECT v.id, v.session_key, v.number, v.start_date AS d,
                    COALESCE(v.n_total, 0) AS n_total, COUNT(vo.id) AS actual_votes
             FROM Voting v
             LEFT JOIN Vote vo ON v.id = vo.voting_id
             GROUP BY v.id
             HAVING actual_votes != COALESCE(v.n_total, 0)
           ),
           ctx AS (
             SELECT mism.*,
                    CASE WHEN d IS NULL THEN NULL
                         ELSE ${PARLIAMENT_SEATS} - (
                           SELECT COUNT(*) FROM Term t
                           WHERE t.start_date <= mism.d
                             AND (t.end_date IS NULL OR t.end_date >= mism.d))
                    END AS vacant_seats
             FROM mism
           )
           SELECT id, session_key, number, d AS start_date, n_total, actual_votes, vacant_seats
           FROM ctx
           WHERE vacant_seats IS NULL
              OR n_total - actual_votes != vacant_seats`,
        )
        .all(),
  },

  {
    id: "voting-cast-counts-match",
    category: "Data Integrity",
    severity: "error",
    name: "Annettujen äänten jakauma täsmää",
    description:
      "Äänestyksen kirjatut Jaa/Ei/Tyhjää-määrät täytyy vastata täsmälleen yksittäisten äänirivien jakaumaa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT v.id, v.session_key, v.number,
                  v.n_yes, SUM(vo.vote = 'Jaa') AS actual_yes,
                  v.n_no, SUM(vo.vote = 'Ei') AS actual_no,
                  v.n_abstain, SUM(vo.vote = ('Tyhj' || char(228, 228))) AS actual_abstain
           FROM Voting v
           JOIN Vote vo ON vo.voting_id = v.id
           GROUP BY v.id
           HAVING actual_yes != COALESCE(v.n_yes, 0)
               OR actual_no != COALESCE(v.n_no, 0)
               OR actual_abstain != COALESCE(v.n_abstain, 0)`,
        )
        .all(),
  },

  {
    id: "voting-absent-count-matches",
    category: "Data Integrity",
    severity: "error",
    name: "Poissaolojen määrä täsmää",
    description:
      "Äänestyksen kirjatun poissaolomäärän täytyy vastata yksittäisiä Poissa-rivejä, istuntopäivän avoimet edustajanpaikat huomioiden.",
    findingNotes: VACANCY_NOTES,
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `WITH mism AS (
             SELECT v.id, v.session_key, v.number, v.start_date AS d,
                    COALESCE(v.n_absent, 0) AS n_absent,
                    SUM(vo.vote = 'Poissa') AS actual_absent
             FROM Voting v
             JOIN Vote vo ON vo.voting_id = v.id
             GROUP BY v.id
             HAVING actual_absent != COALESCE(v.n_absent, 0)
           ),
           ctx AS (
             SELECT mism.*,
                    CASE WHEN d IS NULL THEN NULL
                         ELSE ${PARLIAMENT_SEATS} - (
                           SELECT COUNT(*) FROM Term t
                           WHERE t.start_date <= mism.d
                             AND (t.end_date IS NULL OR t.end_date >= mism.d))
                    END AS vacant_seats
             FROM mism
           )
           SELECT id, session_key, number, d AS start_date, n_absent, actual_absent, vacant_seats
           FROM ctx
           WHERE vacant_seats IS NULL
              OR n_absent - actual_absent != vacant_seats`,
        )
        .all(),
  },

  // ── Referential Integrity ────────────────────────────────────────────────────

  {
    id: "vote-voting-links",
    category: "Referential Integrity",
    severity: "error",
    name: "Äänet → Äänestykset",
    description:
      "Kaikkien äänirivien täytyy viitata olemassa olevaan äänestykseen.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT DISTINCT vo.voting_id
           FROM Vote vo
           WHERE NOT EXISTS (
             SELECT 1 FROM Voting v WHERE v.id = vo.voting_id
           )`,
        )
        .all(),
  },

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
    name: "Äänestykset → Istunnot (vaalikaudesta 2015 alkaen)",
    description:
      "Vaalikaudesta 2015 (22.4.2015) alkaen jokaisen äänestyksen täytyy viitata olemassa olevaan istuntoon. Vanhempia äänestyksiä ei tarkisteta, koska niiden istuntoviittaukset käyttävät vanhan järjestelmän numerointia.",
    findingNotes:
      "Äänestyshistoria alkaa 12.6.1996, mutta istuntohistoria vasta 2.6.2014, ja huhtikuuta 2015 edeltävät äänestykset käyttävät vanhan järjestelmän istuntonumerointia (esim. äänestyksen avain 2014/66, istuntotaulun avaimet muotoa 2014/257). Vanhoja äänestyksiä ei siksi voi linkittää istuntoihin; vaalikauden 2015 ensimmäisestä täysistunnosta alkaen linkityksen täytyy olla aukoton.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT id, session_key, start_date FROM Voting
           WHERE start_date >= '${SESSION_LINKAGE_RELIABLE_FROM}'
             AND NOT EXISTS (
               SELECT 1 FROM Session s WHERE s.key = session_key
             )`,
        )
        .all(),
  },

  {
    id: "votes-have-active-term",
    category: "Referential Integrity",
    severity: "warning",
    name: "Äänet annettu toimikauden aikana",
    description:
      "Jokaisen äänestyspäivän äänillä täytyy olla äänestäjälle voimassa oleva toimikausi.",
    findingNotes:
      "Toimikausidata ei kata 1990-luvun sijaisuusjaksoja täydellisesti. Tunnetut tapaukset: Nikula 13.3.1998, Kemppainen 23.4.–18.6.1999 (kolme äänestyspäivää) ja Erlund 25.4.2000 — näinä päivinä annetuille äänille ei löydy voimassa olevaa toimikautta.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT s.person_id, s.voting_date
           FROM PersonVotingDailyStats s
           WHERE NOT EXISTS (
             SELECT 1 FROM Term t
             WHERE t.person_id = s.person_id
               AND t.start_date <= s.voting_date
               AND (t.end_date IS NULL OR t.end_date >= s.voting_date)
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

  // ── Schema Integrity ─────────────────────────────────────────────────────────

  {
    id: "vote-group-abbreviation-column-name-correct",
    category: "Schema Integrity",
    severity: "error",
    name: "Vote-taulun ryhmätunnussarake nimetty oikein",
    description:
      "Vote-taulussa tulee olla sarake group_abbreviation eikä virheellisesti nimettyä group_abbrviation-saraketta.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT 'missing_group_abbreviation' AS issue
           WHERE NOT EXISTS (
             SELECT 1 FROM pragma_table_info('Vote')
             WHERE name = 'group_abbreviation'
           )
           UNION ALL
           SELECT 'unexpected_group_abbrviation' AS issue
           WHERE EXISTS (
             SELECT 1 FROM pragma_table_info('Vote')
             WHERE name = 'group_abbrviation'
           )`,
        )
        .all(),
  },

  {
    id: "legacy-document-tables-absent",
    category: "Schema Integrity",
    severity: "error",
    name: "Legacy-asiakirjataulut poistettu",
    description:
      "Poistettujen legacy-asiakirjataulujen ei tule enää olla mukana lopullisessa skeemassa.",
    query: (db: Database) =>
      db
        .query<Record<string, unknown>, []>(
          `SELECT name
           FROM sqlite_master
           WHERE type = 'table'
             AND name IN (
               'SessionSectionSpeech',
               'Document',
               'DocumentActor',
               'DocumentSubject',
               'DocumentRelation',
               'SessionMinutesItem'
             )`,
        )
        .all(),
  },
];

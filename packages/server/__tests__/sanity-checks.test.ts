import { Database } from "bun:sqlite";
import { describe, expect, test } from "bun:test";
import { sanityChecks } from "../src/features/quality/quality.checks";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const migratedCheckIds = [
  "voting-cast-counts-match",
  "voting-absent-count-matches",
  "voting-individual-count-matches",
  "voting-session-links",
  "vote-voting-links",
  "no-future-votings",
  "group-membership-no-overlaps",
  "government-dates-no-overlap",
  "government-dates-precision",
  "votes-have-active-term",
  "parliament-seat-vacancies",
  "vote-group-abbreviation-trimmed",
  "speech-party-abbreviation-null-not-empty",
  "speech-ministry-null-not-empty",
  "section-note-null-not-empty",
  "section-processing-title-null-not-empty",
  "section-resolution-null-not-empty",
  "voting-title-null-not-empty",
  "vote-group-abbreviation-lowercase",
  "speech-party-abbreviation-lowercase",
  "roll-call-entry-party-lowercase",
  "vaski-document-type-normalized",
  "roll-call-entry-names-present",
  "roll-call-entry-names-trimmed",
  "vote-values-normalized",
  "roll-call-report-status-known-values",
  "vaski-document-source-path-present",
  "speech-content-source-path-present",
  "vote-group-abbreviation-column-name-correct",
  "legacy-document-tables-absent",
] as const;

function findCheck(id: (typeof migratedCheckIds)[number]) {
  const check = sanityChecks.find((candidate) => candidate.id === id);
  expect(check).toBeDefined();
  return check!;
}

describe("sanity checks", () => {
  test("includes all migrated real-db data quality checks", () => {
    const ids = new Set(sanityChecks.map((check) => check.id));
    for (const id of migratedCheckIds) {
      expect(ids.has(id)).toBe(true);
    }
  });

  test("migrated check ids are unique", () => {
    const seen = new Set<string>();
    for (const id of migratedCheckIds) {
      expect(seen.has(id)).toBe(false);
      seen.add(id);
    }
  });

  test("trim and empty-string checks execute against the in-memory test db", () => {
    const db = createTestDb();
    seedFullDataset(db);

    db.run(`UPDATE Vote SET group_abbreviation = ? WHERE id = ?`, [
      "sd   ",
      5000,
    ]);
    db.run(`UPDATE Speech SET party_abbreviation = '' WHERE id = ?`, [200]);

    const trimmedRows = findCheck("vote-group-abbreviation-trimmed").query(db);
    const emptyStringRows = findCheck(
      "speech-party-abbreviation-null-not-empty",
    ).query(db);

    expect(trimmedRows).toHaveLength(1);
    expect(trimmedRows[0]?.id).toBe(5000);
    expect(emptyStringRows).toHaveLength(1);
    expect(emptyStringRows[0]?.id).toBe(200);

    db.close();
  });

  test("schema integrity checks pass for the migrated schema", () => {
    const db = createTestDb();

    expect(
      findCheck("vote-group-abbreviation-column-name-correct").query(db),
    ).toEqual([]);
    expect(findCheck("legacy-document-tables-absent").query(db)).toEqual([]);

    db.close();
  });

  test("schema integrity checks report violations on broken schemas", () => {
    const typoDb = new Database(":memory:");
    typoDb.exec(
      `CREATE TABLE Vote (id INTEGER PRIMARY KEY, group_abbrviation TEXT);`,
    );

    const typoRows = findCheck(
      "vote-group-abbreviation-column-name-correct",
    ).query(typoDb);
    expect(typoRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ issue: "missing_group_abbreviation" }),
        expect.objectContaining({ issue: "unexpected_group_abbrviation" }),
      ]),
    );
    typoDb.close();

    const legacyDb = new Database(":memory:");
    legacyDb.exec(`CREATE TABLE SessionMinutesItem (id INTEGER PRIMARY KEY);`);

    const legacyRows = findCheck("legacy-document-tables-absent").query(
      legacyDb,
    );
    expect(legacyRows).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "SessionMinutesItem" }),
      ]),
    );
    legacyDb.close();
  });

  test("document and roll-call normalization checks return concrete violating rows", () => {
    const db = createTestDb();
    seedFullDataset(db);

    db.run(
      `INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path)
       VALUES (?, ?, ?, ?)`,
      [1, "Poytakirja", "PTK 1/2024 vp", ""],
    );
    db.run(
      `INSERT INTO RollCallReport (id, parliament_identifier, session_date, status, edk_identifier, source_path)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1, "1/2024", "2024-01-15", "9", "NHR 1/2024 vp", "/rollcall/1"],
    );
    db.run(
      `INSERT INTO RollCallEntry (roll_call_id, entry_order, person_id, first_name, last_name, party, entry_type)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [1, 1, 1000, " Matti ", "Meikäläinen", "SD", "absent"],
    );

    expect(findCheck("vaski-document-type-normalized").query(db)).toHaveLength(
      1,
    );
    expect(
      findCheck("vaski-document-source-path-present").query(db),
    ).toHaveLength(1);
    expect(
      findCheck("roll-call-report-status-known-values").query(db),
    ).toHaveLength(1);
    expect(findCheck("roll-call-entry-party-lowercase").query(db)).toHaveLength(
      1,
    );
    expect(findCheck("roll-call-entry-names-trimmed").query(db)).toHaveLength(
      1,
    );

    db.close();
  });

  test("voting-cast-counts-match passes for a consistent voting", () => {
    const db = createTestDb();
    seedConsistentVoting(db);

    expect(findCheck("voting-cast-counts-match").query(db)).toEqual([]);

    db.close();
  });

  test("voting-cast-counts-match flags a voting whose cast counts diverge", () => {
    const db = createTestDb();
    seedConsistentVoting(db);

    // Flip one Jaa to Ei without updating the recorded n_yes / n_no.
    db.run(`UPDATE Vote SET vote = 'Ei' WHERE id = 9001`);

    const rows = findCheck("voting-cast-counts-match").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(300);
    expect(rows[0]?.actual_yes).toBe(1);
    expect(rows[0]?.actual_no).toBe(2);

    db.close();
  });

  test("voting-cast-counts-match ignores absent-count divergence", () => {
    const db = createTestDb();
    seedConsistentVoting(db);

    db.run(`UPDATE Voting SET n_absent = 5 WHERE id = 300`);

    expect(findCheck("voting-cast-counts-match").query(db)).toEqual([]);

    db.close();
  });

  test("voting-absent-count-matches accepts mismatches explained by vacant seats", () => {
    const db = createTestDb();
    seedParliamentSeats(db, 200);

    // Voting with 2 individual rows but n_absent records one extra absentee.
    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total)
       VALUES (400, 1, '2024-01-15T10:00:00', 1, 0, 0, 2, 3)`,
    );
    db.run(
      `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES
         (9500, 400, 3000, 'Jaa', 'kesk'),
         (9501, 400, 3001, 'Poissa', 'sd')`,
    );

    // Full 200-seat chamber: the extra absentee is unexplained.
    let rows = findCheck("voting-absent-count-matches").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(400);
    expect(rows[0]?.vacant_seats).toBe(0);

    // One seat vacant on the voting date: difference is explained.
    db.run(`UPDATE Term SET end_date = '2024-01-10' WHERE id = 699`);
    rows = findCheck("voting-absent-count-matches").query(db);
    expect(rows).toEqual([]);

    db.close();
  });

  test("voting-absent-count-matches flags mismatches strictly when the voting has no date", () => {
    const db = createTestDb();
    seedParliamentSeats(db, 199);

    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total)
       VALUES (401, 1, NULL, 0, 0, 0, 2, 2)`,
    );
    db.run(
      `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation)
       VALUES (9510, 401, 3000, 'Poissa', 'kesk')`,
    );

    const rows = findCheck("voting-absent-count-matches").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(401);
    expect(rows[0]?.vacant_seats).toBeNull();

    db.close();
  });

  test("voting-individual-count-matches accepts row-count gaps explained by vacant seats", () => {
    const db = createTestDb();
    seedParliamentSeats(db, 200);

    // n_total records one more vote than there are individual rows.
    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total)
       VALUES (410, 1, '2024-01-15T10:00:00', 1, 0, 0, 2, 3)`,
    );
    db.run(
      `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES
         (9520, 410, 3000, 'Jaa', 'kesk'),
         (9521, 410, 3001, 'Poissa', 'sd')`,
    );

    let rows = findCheck("voting-individual-count-matches").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(410);
    expect(rows[0]?.vacant_seats).toBe(0);

    db.run(`UPDATE Term SET end_date = '2024-01-10' WHERE id = 699`);
    rows = findCheck("voting-individual-count-matches").query(db);
    expect(rows).toEqual([]);

    db.close();
  });

  test("voting-session-links only validates votings from the 2015 electoral term onwards", () => {
    const db = createTestDb();
    seedFullDataset(db);

    // Dangling session_key rows violate the FK by design.
    db.exec("PRAGMA foreign_keys = OFF");

    // Legacy era: dangling session_key before the cutoff is expected.
    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total, session_key)
       VALUES (420, 1, '2014-09-01T14:00:00', 0, 0, 0, 0, 0, '1994/1')`,
    );

    expect(findCheck("voting-session-links").query(db)).toEqual([]);

    // Modern era: dangling session_key is a violation.
    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total, session_key)
       VALUES (421, 2, '2020-02-01T14:00:00', 0, 0, 0, 0, 0, '1994/2')`,
    );

    const rows = findCheck("voting-session-links").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(421);

    db.close();
  });

  test("government overlap is checked strictly for the modern era only", () => {
    const db = createTestDb();

    db.run(
      `INSERT INTO Government (id, name, start_date, end_date) VALUES
         (50, 'Testikabinetti A', '2010-01-05', '2012-03-01'),
         (51, 'Testikabinetti B', '2012-03-01', '2015-05-28'),
         (52, 'Testikabinetti C', '2016-02-02', '2017-06-30'),
         (53, 'Testikabinetti D', '2017-01-10', '2018-02-01'),
         (54, 'Testikabinetti E', '1970-01-01', '1970-12-31'),
         (55, 'Testikabinetti F', '1970-06-15', '1971-12-31')`,
    );

    // Same-day handover (A→B) passes; placeholder-era overlap (E/F) ignored;
    // genuine modern overlap (C/D) flagged.
    const rows = findCheck("government-dates-no-overlap").query(db);
    expect(rows).toHaveLength(1);
    expect([rows[0]?.gov_a, rows[0]?.gov_b].sort()).toEqual([52, 53]);

    db.close();
  });

  test("government-dates-precision lists placeholder-dated governments", () => {
    const db = createTestDb();

    db.run(
      `INSERT INTO Government (id, name, start_date, end_date) VALUES
         (60, 'Tarkka hallitus', '2019-06-06', '2023-06-20'),
         (61, 'Avoin hallitus', '2023-06-20', NULL),
         (62, 'Vuositarkkuus alku', '1929-01-01', '1930-07-04'),
         (63, 'Vuositarkkuus loppu', '1983-05-06', '1987-12-31')`,
    );

    const rows = findCheck("government-dates-precision").query(db);
    expect(rows.map((r) => r.id).sort()).toEqual([62, 63]);

    db.close();
  });

  test("vaski-document-type-normalized validates shape instead of a whitelist", () => {
    const db = createTestDb();

    db.run(
      `INSERT INTO VaskiDocument (id, document_type, edk_identifier, source_path) VALUES
         (10, 'asiantuntijalausunto', 'EDK-1', '/a'),
         (11, 'foo bar', 'EDK-2', '/b'),
         (12, '', 'EDK-3', '/c')`,
    );

    const rows = findCheck("vaski-document-type-normalized").query(db);
    expect(rows.map((r) => r.id).sort()).toEqual([11, 12]);

    db.close();
  });

  test("votes-have-active-term flags votes outside any term", () => {
    const db = createTestDb();
    seedFullDataset(db);

    expect(findCheck("votes-have-active-term").query(db)).toEqual([]);

    // Person 1000's term starts 2023-04-01 — a 2020 voting day has no cover.
    db.run(
      `INSERT INTO PersonVotingDailyStats (person_id, voting_date, votes_cast, total_votings)
       VALUES (1000, '2020-01-01', 1, 1)`,
    );

    const rows = findCheck("votes-have-active-term").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.person_id).toBe(1000);
    expect(rows[0]?.voting_date).toBe("2020-01-01");

    db.close();
  });

  test("parliament-seat-vacancies is informational and explains the known cause", () => {
    const check = findCheck("parliament-seat-vacancies");

    expect(check.severity).toBe("info");
    expect(check.findingNotes ?? "").not.toBe("");
  });

  test("parliament-seat-vacancies marks the vacancy evidence in the data", () => {
    const db = createTestDb();
    seedParliamentSeats(db, 200);
    db.run(
      `INSERT INTO Session (id, number, key, date, year, type)
       VALUES (700, 1, '2024/700', '2024-01-15', 2024, 'TAYSISTUN')`,
    );

    // Full chamber: nothing to report.
    expect(findCheck("parliament-seat-vacancies").query(db)).toEqual([]);

    // Seat 3199 vacated 2024-01-10; successor seated 2024-01-20.
    db.run(`UPDATE Term SET end_date = '2024-01-10' WHERE id = 699`);
    db.run(
      `INSERT INTO Representative (person_id, last_name, first_name)
       VALUES (3500, 'Seuraaja', 'Simo')`,
    );
    db.run(
      `INSERT INTO Term (id, person_id, start_date, end_date)
       VALUES (800, 3500, '2024-01-20', NULL)`,
    );

    const rows = findCheck("parliament-seat-vacancies").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.date).toBe("2024-01-15");
    expect(rows[0]?.mp_count).toBe(199);
    expect(rows[0]?.vacant_seats).toBe(1);
    expect(String(rows[0]?.recent_departures)).toContain("Sukunimi199");
    expect(String(rows[0]?.recent_departures)).toContain("2024-01-10");
    expect(String(rows[0]?.next_seatings)).toContain("Seuraaja Simo");
    expect(String(rows[0]?.next_seatings)).toContain("2024-01-20");

    db.close();
  });

  test("vote-voting-links flags votes pointing at missing votings", () => {
    const db = createTestDb();
    seedConsistentVoting(db);

    expect(findCheck("vote-voting-links").query(db)).toEqual([]);

    db.exec("PRAGMA foreign_keys = OFF");
    db.run(
      `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation)
       VALUES (9100, 999999, 2000, 'Jaa', 'kesk')`,
    );

    const rows = findCheck("vote-voting-links").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.voting_id).toBe(999999);

    db.close();
  });

  test("group-membership-no-overlaps flags concurrent memberships in different groups", () => {
    const db = createTestDb();
    seedFullDataset(db);

    expect(findCheck("group-membership-no-overlaps").query(db)).toEqual([]);

    // Person 1000 joins another group while the kesk membership is still open.
    db.run(
      `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
       VALUES (99, 1000, 'sd', 'Sosialidemokraattinen eduskuntaryhmä', '2024-01-01', NULL)`,
    );

    const rows = findCheck("group-membership-no-overlaps").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.person_id).toBe(1000);
    expect(rows[0]?.group_a).toBe("kesk");
    expect(rows[0]?.group_b).toBe("sd");

    db.close();
  });

  test("no-future-votings flags votings dated in the future", () => {
    const db = createTestDb();
    seedConsistentVoting(db);

    expect(findCheck("no-future-votings").query(db)).toEqual([]);

    db.run(
      `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total)
       VALUES (301, 2, '2099-01-01T10:00:00', 0, 0, 0, 0, 0)`,
    );

    const rows = findCheck("no-future-votings").query(db);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.id).toBe(301);

    db.close();
  });
});

/**
 * Seeds `count` representatives (person_id 3000+) with open-ended terms
 * (Term id 500+) so vacancy math against the constitutional 200-seat
 * chamber works in fixtures. Term id 699 belongs to the last seat when
 * count = 200 — end it to open one vacancy.
 */
function seedParliamentSeats(db: Database, count: number) {
  const insertPerson = db.prepare(
    `INSERT INTO Representative (person_id, last_name, first_name) VALUES (?, ?, ?)`,
  );
  const insertTerm = db.prepare(
    `INSERT INTO Term (id, person_id, start_date, end_date) VALUES (?, ?, '2023-04-01', NULL)`,
  );
  for (let i = 0; i < count; i++) {
    insertPerson.run(3000 + i, `Sukunimi${i}`, `Etunimi${i}`);
    insertTerm.run(500 + i, 3000 + i);
  }
  insertPerson.finalize();
  insertTerm.finalize();
}

/**
 * A voting whose recorded counts match its individual votes exactly —
 * unlike seedFullDataset, whose votings intentionally have n_total = 200
 * with only three Vote rows.
 */
function seedConsistentVoting(db: Database) {
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name) VALUES
       (2000, 'Aaltonen', 'Anna'),
       (2001, 'Berg', 'Bertta'),
       (2002, 'Common', 'Carita'),
       (2003, 'Degerman', 'Doris')`,
  );
  db.run(
    `INSERT INTO Voting (id, number, start_time, n_yes, n_no, n_abstain, n_absent, n_total)
     VALUES (300, 1, '2024-01-15T10:00:00', 2, 1, 1, 0, 4)`,
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES
       (9001, 300, 2000, 'Jaa', 'kesk'),
       (9002, 300, 2001, 'Jaa', 'sd'),
       (9003, 300, 2002, 'Ei', 'kok'),
       (9004, 300, 2003, ('Tyhj' || char(228, 228)), 'vihr')`,
  );
}

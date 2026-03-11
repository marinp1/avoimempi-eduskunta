import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import ageDivisionOverTime from "../database/queries/AGE_DIVISION_OVER_TIME.sql";
import closeVotes from "../database/queries/CLOSE_VOTES.sql";
import coalitionVsOpposition from "../database/queries/COALITION_VS_OPPOSITION.sql";
import committeeOverview from "../database/queries/COMMITTEE_OVERVIEW.sql";
import currentComposition from "../database/queries/CURRENT_COMPOSITION.sql";
import dissentTracking from "../database/queries/DISSENT_TRACKING.sql";
import federatedSearch from "../database/queries/FEDERATED_SEARCH.sql";
import genderDivisionOverTime from "../database/queries/GENDER_DIVISION_OVER_TIME.sql";
import governmentMemberships from "../database/queries/GOVERNMENT_MEMBERSHIPS.sql";
import leavingParliamentRecords from "../database/queries/LEAVING_PARLIAMENT.sql";
import mpActivityRanking from "../database/queries/MP_ACTIVITY_RANKING.sql";
import partyDiscipline from "../database/queries/PARTY_DISCIPLINE.sql";
import partyMembers from "../database/queries/PARTY_MEMBERS.sql";
import partyParticipationByGovernment from "../database/queries/PARTY_PARTICIPATION_BY_GOVERNMENT.sql";
import partySummary from "../database/queries/PARTY_SUMMARY.sql";
import personCommittees from "../database/queries/PERSON_COMMITTEES.sql";
import personDissents from "../database/queries/PERSON_DISSENTS.sql";
import personGroupMemberships from "../database/queries/PERSON_GROUP_MEMBERSHIPS.sql";
import personQuestions from "../database/queries/PERSON_QUESTIONS.sql";
import personSearch from "../database/queries/PERSON_SEARCH.sql";
import personSpeeches from "../database/queries/PERSON_SPEECHES.sql";
import personTerms from "../database/queries/PERSON_TERMS.sql";
import recentActivity from "../database/queries/RECENT_ACTIVITY.sql";
import representativeDetails from "../database/queries/REPRESENTATIVE_DETAILS.sql";
import representativeDistricts from "../database/queries/REPRESENTATIVE_DISTRICTS.sql";
import representativesPaginated from "../database/queries/REPRESENTATIVES_PAGINATED.sql";
import sectionDocumentLinks from "../database/queries/SECTION_DOCUMENT_LINKS.sql";
import sectionSpeechCount from "../database/queries/SECTION_SPEECH_COUNT.sql";
import sectionSpeeches from "../database/queries/SECTION_SPEECHES.sql";
import sectionVotings from "../database/queries/SECTION_VOTINGS.sql";
import sessionByDate from "../database/queries/SESSION_BY_DATE.sql";
import sessionCount from "../database/queries/SESSION_COUNT.sql";
import sessionDates from "../database/queries/SESSION_DATES.sql";
import sessionDocuments from "../database/queries/SESSION_DOCUMENTS.sql";
import sessionNotices from "../database/queries/SESSION_NOTICES.sql";
import sessionSections from "../database/queries/SESSION_SECTIONS.sql";
import sessionVotingCount from "../database/queries/SESSION_VOTING_COUNT.sql";
import sessions from "../database/queries/SESSIONS.sql";
import sessionsPaginated from "../database/queries/SESSIONS_PAGINATED.sql";
import speechActivity from "../database/queries/SPEECH_ACTIVITY.sql";
import speechesByDate from "../database/queries/SPEECHES_BY_DATE.sql";
import trustPositions from "../database/queries/TRUST_POSITIONS.sql";
import votesByPerson from "../database/queries/VOTES_BY_PERSON.sql";
import votingParticipation from "../database/queries/VOTING_PARTICIPATION.sql";
import votingParticipationByGovernment from "../database/queries/VOTING_PARTICIPATION_BY_GOVERNMENT.sql";
import votingRelatedById from "../database/queries/VOTING_RELATED_BY_ID.sql";
import votingsBrowse from "../database/queries/VOTINGS_BROWSE.sql";
import votingsByDocument from "../database/queries/VOTINGS_BY_DOCUMENT.sql";
import votingsOverviewClose from "../database/queries/VOTINGS_OVERVIEW_CLOSE.sql";
import votingsOverviewMetrics from "../database/queries/VOTINGS_OVERVIEW_METRICS.sql";
import votingsOverviewPhases from "../database/queries/VOTINGS_OVERVIEW_PHASES.sql";
import votingsOverviewSessions from "../database/queries/VOTINGS_OVERVIEW_SESSIONS.sql";
import votingsOverviewTurnout from "../database/queries/VOTINGS_OVERVIEW_TURNOUT.sql";
import votingsSearch from "../database/queries/VOTINGS_SEARCH.sql";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const queries = {
  ageDivisionOverTime,
  closeVotes,
  coalitionVsOpposition,
  committeeOverview,
  currentComposition,
  dissentTracking,
  federatedSearch,
  genderDivisionOverTime,
  governmentMemberships,
  leavingParliamentRecords,
  mpActivityRanking,
  partyDiscipline,
  partyMembers,
  partyParticipationByGovernment,
  partySummary,
  personCommittees,
  personDissents,
  personGroupMemberships,
  personQuestions,
  personSearch,
  personSpeeches,
  personTerms,
  recentActivity,
  representativeDetails,
  representativeDistricts,
  representativesPaginated,
  sectionDocumentLinks,
  sectionSpeechCount,
  sectionSpeeches,
  sectionVotings,
  sessionByDate,
  sessionCount,
  sessionDates,
  sessionDocuments,
  sessionNotices,
  sessions,
  sessionSections,
  sessionsPaginated,
  sessionVotingCount,
  speechActivity,
  speechesByDate,
  trustPositions,
  votesByPerson,
  votingsBrowse,
  votingsOverviewClose,
  votingsOverviewMetrics,
  votingsOverviewPhases,
  votingsOverviewSessions,
  votingsOverviewTurnout,
  votingParticipation,
  votingParticipationByGovernment,
  votingRelatedById,
  votingsByDocument,
  votingsSearch,
} as const;

/**
 * These tests validate that all SQL queries execute without errors
 * and return the expected shape of data from a seeded in-memory database.
 */

let db: Database;

beforeAll(() => {
  db = createTestDb();
  seedFullDataset(db);
});

afterAll(() => {
  db.close();
});

describe("Query compilation", () => {
  test("all SQL queries prepare without errors", () => {
    const queryEntries = Object.entries(queries).filter(
      ([, value]) => typeof value === "string",
    ) as Array<[string, string]>;

    for (const [name, sql] of queryEntries) {
      const stmt = db.prepare(sql);
      stmt.finalize();
      expect(sql.length).toBeGreaterThan(0);
      expect(name.length).toBeGreaterThan(0);
    }
  });

  test("no GROUP_CONCAT(DISTINCT ...) uses a separator argument", () => {
    const queryEntries = Object.values(queries).filter(
      (value) => typeof value === "string",
    ) as string[];
    const invalid = queryEntries.filter((sql) =>
      /group_concat\s*\(\s*distinct[^)]*,/i.test(sql),
    );

    expect(invalid).toHaveLength(0);
  });
});

// ─── REPRESENTATIVE QUERIES ─────────────────────────────────

describe("Representative queries", () => {
  test("SELECT * FROM Representative returns paginated results", () => {
    const stmt = db.prepare(representativesPaginated);
    const rows = stmt.all({ $limit: 10, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("person_id");
    expect(rows[0]).toHaveProperty("first_name");
    expect(rows[0]).toHaveProperty("last_name");
  });

  test("REPRESENTATIVE_DETAILS returns single rep by id", () => {
    const stmt = db.prepare(representativeDetails);
    const row = stmt.get({ $personId: 1000 }) as any;
    stmt.finalize();

    expect(row).not.toBeNull();
    expect(row.person_id).toBe(1000);
    expect(row.first_name).toBe("Matti");
    expect(row.last_name).toBe("Meikäläinen");
  });

  test("REPRESENTATIVE_DETAILS returns null for non-existent id", () => {
    const stmt = db.prepare(representativeDetails);
    const row = stmt.get({ $personId: 9999 });
    stmt.finalize();

    expect(row).toBeNull();
  });

  test("REPRESENTATIVE_DISTRICTS returns districts with names", () => {
    const stmt = db.prepare(representativeDistricts);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].district_name).toBe("Helsingin vaalipiiri");
    expect(rows[0].person_id).toBe(1000);
  });

  test("REPRESENTATIVE_DISTRICTS returns empty for non-existent id", () => {
    const stmt = db.prepare(representativeDistricts);
    const rows = stmt.all({ $personId: 9999 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── GROUP MEMBERSHIP QUERIES ───────────────────────────────

describe("Group membership queries", () => {
  test("returns group memberships for a person", () => {
    const stmt = db.prepare(personGroupMemberships);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].group_name).toBe("Keskustan eduskuntaryhmä");
  });
});

// ─── TERM QUERIES ───────────────────────────────────────────

describe("Term queries", () => {
  test("returns terms for a person", () => {
    const stmt = db.prepare(personTerms);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].start_date).toBe("2023-04-01");
    expect(rows[0].start_year).toBe(2023);
  });
});

// ─── VOTES BY PERSON ────────────────────────────────────────

describe("Votes by person queries", () => {
  test("VOTES_BY_PERSON returns votes with voting details", () => {
    const stmt = db.prepare(votesByPerson);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].start_time).toBe("2024-01-15T11:00:00");
    expect(rows[0].vote).toBe("Jaa");
    expect(rows[0].group_abbreviation).toBe("kesk");
  });

  test("returns empty for person with no votes", () => {
    const stmt = db.prepare(votesByPerson);
    const rows = stmt.all({ $personId: 9999 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── PERSON QUESTION QUERIES ───────────────────────────────

describe("Person question queries", () => {
  test("PERSON_QUESTIONS returns interpellations, oral questions, and written questions", () => {
    db.run(
      `INSERT INTO Interpellation (id, parliament_identifier, document_number, parliamentary_year, title, submission_date, first_signer_person_id, source_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        81001,
        "VK 1/2024 vp",
        1,
        "2024",
        "Valikysymys hallitukselle",
        "2024-02-03",
        1000,
        "test/interpellation/81001.json",
      ],
    );
    db.run(
      `INSERT INTO InterpellationSigner (interpellation_id, signer_order, person_id, first_name, last_name, party, is_first_signer)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [81001, 1, 1000, "Matti", "Meikäläinen", "kesk", 1],
    );

    db.run(
      `INSERT INTO WrittenQuestion (id, parliament_identifier, document_number, parliamentary_year, title, submission_date, first_signer_person_id, source_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        81002,
        "KK 10/2024 vp",
        10,
        "2024",
        "Kirjallinen kysymys energiasta",
        "2024-02-02",
        1001,
        "test/written-question/81002.json",
      ],
    );
    db.run(
      `INSERT INTO WrittenQuestionSigner (question_id, signer_order, person_id, first_name, last_name, party, is_first_signer)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [81002, 2, 1000, "Matti", "Meikäläinen", "kesk", 0],
    );

    db.run(
      `INSERT INTO OralQuestion (id, parliament_identifier, document_number, parliamentary_year, title, question_text, asker_text, submission_date, source_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        81003,
        "SKT 5/2024 vp",
        5,
        "2024",
        "Suullinen kysymys energiasta (kansanedustaja Matti Meikäläinen /kesk)",
        "Energia",
        "kansanedustaja Matti Meikäläinen /kesk",
        "2024-02-01",
        "test/oral-question/81003.json",
      ],
    );

    try {
      const stmt = db.prepare(personQuestions);
      const rows = stmt.all({ $personId: 1000, $limit: 50 }) as any[];
      stmt.finalize();

      expect(rows).toHaveLength(3);

      const interpellation = rows.find(
        (row) => row.question_kind === "interpellation",
      );
      expect(interpellation?.parliament_identifier).toBe("VK 1/2024 vp");
      expect(interpellation?.relation_role).toBe("first_signer");

      const writtenQuestion = rows.find(
        (row) => row.question_kind === "written_question",
      );
      expect(writtenQuestion?.parliament_identifier).toBe("KK 10/2024 vp");
      expect(writtenQuestion?.relation_role).toBe("signer");

      const oralQuestion = rows.find(
        (row) => row.question_kind === "oral_question",
      );
      expect(oralQuestion?.parliament_identifier).toBe("SKT 5/2024 vp");
      expect(oralQuestion?.relation_role).toBe("asker");
    } finally {
      db.run(
        `DELETE FROM InterpellationSigner WHERE interpellation_id = ?`,
        [81001],
      );
      db.run(`DELETE FROM Interpellation WHERE id = ?`, [81001]);

      db.run(
        `DELETE FROM WrittenQuestionSigner WHERE question_id = ?`,
        [81002],
      );
      db.run(`DELETE FROM WrittenQuestion WHERE id = ?`, [81002]);

      db.run(`DELETE FROM OralQuestion WHERE id = ?`, [81003]);
    }
  });

  test("PERSON_QUESTIONS returns empty for person with no matches", () => {
    const stmt = db.prepare(personQuestions);
    const rows = stmt.all({ $personId: 9999, $limit: 50 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── SESSION QUERIES ────────────────────────────────────────

describe("Session queries", () => {
  test("SESSIONS returns all sessions with agenda info", () => {
    const stmt = db.prepare(sessions);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty("agenda_title");
    expect(rows[0]).toHaveProperty("agenda_state");
  });

  test("SESSION_COUNT returns total session count", () => {
    const stmt = db.prepare(sessionCount);
    const row = stmt.get() as any;
    stmt.finalize();

    expect(row.count).toBe(2);
  });

  test("SESSIONS_PAGINATED respects limit and offset", () => {
    const stmt = db.prepare(sessionsPaginated);
    const rows = stmt.all({ $limit: 1, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("2024/2");
  });

  test("SESSION_SECTIONS returns sections for a session", () => {
    const stmt = db.prepare(sessionSections);
    const rows = stmt.all({ $sessionKey: "2024/1" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].ordinal).toBe(3);
    expect(rows[1].ordinal).toBe(4);
  });

  test("SESSION_SECTIONS returns empty for non-existent session", () => {
    const stmt = db.prepare(sessionSections);
    const rows = stmt.all({ $sessionKey: "nonexistent" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("SESSION_SECTIONS keeps legacy document fields null", () => {
    try {
      db.run(`INSERT INTO Agenda (key, title, state) VALUES (?, ?, ?)`, [
        "PJ_2025_136",
        "Täysistunnon päiväjärjestys 136/2025",
        "Valmis",
      ]);
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state, agenda_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          3136,
          136,
          "2025/136",
          "2025-12-21",
          2025,
          "varsinainen",
          "Päättynyt",
          "PJ_2025_136",
        ],
      );
      db.run(
        `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key, document_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          31360,
          "2025/136/1",
          "1",
          "Nimenhuuto",
          1,
          "Kokous",
          "2025/136",
          "PJ_2025_136",
          9010,
        ],
      );
      db.run(`UPDATE Session SET minutes_document_id = ? WHERE key = ?`, [
        9011,
        "2025/136",
      ]);

      const stmt = db.prepare(sessionSections);
      const rows = stmt.all({ $sessionKey: "2025/136" }) as any[];
      stmt.finalize();

      expect(rows).toHaveLength(1);
      expect(rows[0].vaski_document_type_name).toBeNull();
      expect(rows[0].vaski_title).toBeNull();
      expect(rows[0].vaski_eduskunta_tunnus).toBeNull();
    } finally {
      db.run(`DELETE FROM Section WHERE id = 31360`);
      db.run(`DELETE FROM Session WHERE id = 3136`);
      db.run(`DELETE FROM Agenda WHERE key = 'PJ_2025_136'`);
    }
  });

  test("SESSION_DOCUMENTS returns agenda, minutes, and roll call documents", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [3140, 140, "2025/140", "2025-12-22", 2025, "varsinainen", "Päättynyt"],
      );
      db.run(
        `UPDATE Session SET agenda_document_id = ?, minutes_document_id = ?, roll_call_document_id = ? WHERE key = ?`,
        [9100, 9101, 9102, "2025/140"],
      );

      const stmt = db.prepare(sessionDocuments);
      const rows = stmt.all({ $sessionKey: "2025/140" }) as any[];
      stmt.finalize();

      const kinds = rows.map((r) => r.document_kind).sort();
      expect(kinds).toEqual(["agenda", "minutes", "roll_call"]);
      const ids = rows.map((r) => r.id).sort();
      expect(ids).toEqual([9100, 9101, 9102]);
      expect(rows[0].eduskunta_tunnus).toBeNull();
    } finally {
      db.run(`DELETE FROM Session WHERE id = 3140`);
    }
  });

  test("SESSION_DOCUMENTS uses roll_call_document_id when available", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [3141, 141, "2025/141", "2025-12-28", 2025, "varsinainen", "Päättynyt"],
      );
      db.run(`UPDATE Session SET roll_call_document_id = ? WHERE key = ?`, [
        9103,
        "2025/141",
      ]);

      const stmt = db.prepare(sessionDocuments);
      const rows = stmt.all({ $sessionKey: "2025/141" }) as any[];
      stmt.finalize();

      const rollCall = rows.find((r) => r.document_kind === "roll_call");
      expect(rollCall).toBeDefined();
      expect(rollCall?.id).toBe(9103);
      expect(rollCall?.eduskunta_tunnus).toBeNull();
    } finally {
      db.run(`DELETE FROM Session WHERE id = 3141`);
    }
  });

  test("SESSION_NOTICES returns notices for a session", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [3142, 142, "2025/142", "2025-12-23", 2025, "varsinainen", "Päättynyt"],
      );
      db.run(
        `INSERT INTO SessionNotice (id, session_key, notice_type, text_fi, sent_at)
         VALUES (?, ?, ?, ?, ?)`,
        [
          7001,
          "2025/142",
          "Tiedote",
          "Istunto keskeytetty",
          "2025-12-23T12:00:00",
        ],
      );

      const stmt = db.prepare(sessionNotices);
      const rows = stmt.all({ $sessionKey: "2025/142" }) as any[];
      stmt.finalize();

      expect(rows).toHaveLength(1);
      expect(rows[0].text_fi).toBe("Istunto keskeytetty");
    } finally {
      db.run(`DELETE FROM SessionNotice WHERE id = 7001`);
      db.run(`DELETE FROM Session WHERE id = 3142`);
    }
  });

  test("SECTION_DOCUMENT_LINKS returns section links and salidb references", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [3144, 144, "2025/144", "2025-12-26", 2025, "varsinainen", "Päättynyt"],
      );
      db.run(
        `INSERT INTO Section (id, key, title, session_key, ordinal)
         VALUES (?, ?, ?, ?, ?)`,
        [51430, "2025/144/1", "Esityslista", "2025/144", 1],
      );
      db.run(
        `INSERT INTO SectionDocumentLink (id, section_key, name_fi, link_url_fi)
         VALUES (?, ?, ?, ?)`,
        [8010, "2025/144/1", "HE 10/2025 vp", "https://example.com/doc"],
      );
      db.run(
        `INSERT INTO SaliDBDocumentReference (source_type, section_key, document_tunnus, source_url)
         VALUES (?, ?, ?, ?)`,
        [
          "section_document",
          "2025/144/1",
          "HE 10/2025 vp",
          "https://example.com/ref",
        ],
      );

      const stmt = db.prepare(sectionDocumentLinks);
      const rows = stmt.all({ $sectionKey: "2025/144/1" }) as any[];
      stmt.finalize();

      expect(rows).toHaveLength(2);
      const refRow = rows.find((row) => row.source_type === "section_document");
      expect(refRow?.document_tunnus).toBe("HE 10/2025 vp");
      expect(refRow?.document_type_code).toBeNull();
    } finally {
      db.run(`DELETE FROM SectionDocumentLink WHERE id = 8010`);
      db.run(
        `DELETE FROM SaliDBDocumentReference WHERE section_key = '2025/144/1'`,
      );
      db.run(`DELETE FROM Section WHERE id = 51430`);
      db.run(`DELETE FROM Session WHERE id = 3144`);
    }
  });

  test("SECTION_DOCUMENT_LINKS does not inject session roll call into section links", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state, roll_call_document_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          3145,
          145,
          "2025/145",
          "2025-12-27",
          2025,
          "varsinainen",
          "Päättynyt",
          9400,
        ],
      );
      db.run(
        `INSERT INTO Section (id, key, title, session_key, ordinal)
         VALUES (?, ?, ?, ?, ?)`,
        [51450, "2025/145/1", "Nimenhuuto", "2025/145", 1],
      );

      const stmt = db.prepare(sectionDocumentLinks);
      const rows = stmt.all({ $sectionKey: "2025/145/1" }) as any[];
      stmt.finalize();

      const rollCall = rows.find(
        (row) => row.source_type === "session_roll_call",
      );
      expect(rollCall).toBeUndefined();
      expect(rows).toHaveLength(0);
    } finally {
      db.run(`DELETE FROM Section WHERE id = 51450`);
      db.run(`DELETE FROM Session WHERE id = 3145`);
    }
  });

  test("SECTION_DOCUMENT_LINKS deduplicates repeated references", () => {
    try {
      db.run(
        `INSERT INTO Session (id, number, key, date, year, type, state)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [3146, 146, "2025/146", "2025-12-28", 2025, "varsinainen", "Päättynyt"],
      );
      db.run(
        `INSERT INTO Section (id, key, title, session_key, ordinal)
         VALUES (?, ?, ?, ?, ?)`,
        [51460, "2025/146/1", "Esityslista", "2025/146", 1],
      );
      db.run(
        `INSERT INTO SectionDocumentLink (id, section_key, name_fi, link_url_fi)
         VALUES (?, ?, ?, ?)`,
        [8060, "2025/146/1", "HE 11/2025 vp", "https://example.com/he-11"],
      );
      db.run(
        `INSERT INTO SaliDBDocumentReference (source_type, section_key, document_tunnus, source_url, source_text)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "section_document",
          "2025/146/1",
          "HE 11/2025 vp",
          "https://example.com/he-11",
          "HE 11/2025 vp",
        ],
      );
      db.run(
        `INSERT INTO SaliDBDocumentReference (source_type, section_key, document_tunnus, source_url, source_text)
         VALUES (?, ?, ?, ?, ?)`,
        [
          "section_document",
          "2025/146/1",
          "HE 11/2025 vp",
          "https://example.com/he-11",
          "HE 11/2025 vp",
        ],
      );

      const stmt = db.prepare(sectionDocumentLinks);
      const rows = stmt.all({ $sectionKey: "2025/146/1" }) as any[];
      stmt.finalize();

      expect(rows).toHaveLength(1);
      expect(rows[0].source_type).toBe("section_document");
      expect(rows[0].document_tunnus).toBe("HE 11/2025 vp");
      expect(rows[0].document_id).toBeNull();
    } finally {
      db.run(
        `DELETE FROM SaliDBDocumentReference WHERE section_key = '2025/146/1'`,
      );
      db.run(`DELETE FROM SectionDocumentLink WHERE id = 8060`);
      db.run(`DELETE FROM Section WHERE id = 51460`);
      db.run(`DELETE FROM Session WHERE id = 3146`);
    }
  });

  test("SESSION_BY_DATE returns sessions on a specific date", () => {
    const stmt = db.prepare(sessionByDate);
    const rows = stmt.all({ $date: "2024-01-15" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("2024/1");
    expect(rows[0]).toHaveProperty("agenda_title");
  });

  test("SESSION_BY_DATE returns empty for date with no sessions", () => {
    const stmt = db.prepare(sessionByDate);
    const rows = stmt.all({ $date: "2099-01-01" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("SESSION_DATES returns distinct dates in descending order", () => {
    const stmt = db.prepare(sessionDates);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("2024-01-16");
    expect(rows[1].date).toBe("2024-01-15");
  });
});

// ─── SPEECH QUERIES ─────────────────────────────────────────

describe("Speech queries", () => {
  test("SECTION_SPEECH_COUNT returns count for one section", () => {
    const stmt = db.prepare(sectionSpeechCount);
    const row = stmt.get({ $sectionKey: "2024/1/3" }) as any;
    stmt.finalize();

    expect(row.count).toBe(2);
  });

  test("SECTION_SPEECHES returns speeches with nullable content fields", () => {
    const stmt = db.prepare(sectionSpeeches);
    const rows = stmt.all({
      $sectionKey: "2024/1/3",
      $limit: 20,
      $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty("content");
    expect(rows[0]).toHaveProperty("start_time");
    expect(rows[0].party_abbreviation).toBe("kesk");
  });

  test("SECTION_SPEECHES includes SpeechContent when available", () => {
    db.run(
      `INSERT INTO SpeechContent (speech_id, session_key, section_key, source_document_id, source_item_identifier, source_entry_order, source_speech_order, source_speech_identifier, speech_type_code, language_code, start_time, end_time, content, source_path)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        201,
        "2024/1",
        "2024/1/3",
        2921,
        35456,
        1,
        1,
        300434,
        "T",
        "fi",
        "2024-01-15T10:00:00",
        "2024-01-15T10:02:00",
        "Testisisalto puheenvuorolle",
        "vaski-data/pöytäkirja/page_1.json#id=2921",
      ],
    );

    const stmt = db.prepare(sectionSpeeches);
    const rows = stmt.all({
      $sectionKey: "2024/1/3",
      $limit: 20,
      $offset: 0,
    }) as any[];
    stmt.finalize();

    const row = rows.find((entry) => entry.id === 201);
    expect(row).toBeDefined();
    expect(row.content).toBe("Testisisalto puheenvuorolle");
    expect(row.start_time).toBe("2024-01-15T10:00:00");
  });

  test("SECTION_SPEECHES returns empty for non-existent section", () => {
    const stmt = db.prepare(sectionSpeeches);
    const rows = stmt.all({
      $sectionKey: "nonexistent",
      $limit: 20,
      $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("PERSON_SPEECHES returns speeches by person with word count", () => {
    const stmt = db.prepare(personSpeeches);
    const rows = stmt.all({ $personId: 1000, $limit: 50, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty("word_count");
    expect(rows[0].word_count).toBe(0);
    expect(rows[0]).toHaveProperty("content");
    expect(rows[0].content).toBeNull();
  });
});

// ─── VOTING QUERIES ─────────────────────────────────────────

describe("Voting queries", () => {
  test("SESSION_VOTING_COUNT returns votings in one session", () => {
    const stmt = db.prepare(sessionVotingCount);
    const row = stmt.get({ $sessionKey: "2024/1" }) as any;
    stmt.finalize();

    expect(row.voting_count).toBe(2);
  });

  test("VOTINGS_SEARCH returns computed context_title", () => {
    const stmt = db.prepare(votingsSearch);
    const rows = stmt.all({
      $query: "Äänestys",
    }) as Array<DatabaseQueries.VotingSearchResult>;
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("context_title");
    const row100 = rows.find((row) => row.id === 100);
    expect(row100).toBeDefined();
    expect(row100?.context_title).toBe("Hallituksen esitys");
  });

  test("VOTINGS_BY_DOCUMENT uses exact document references instead of text contains", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item, section_title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [9100, 1, "2024-01-15T13:00:00.000", "2024/1", "HE 1/2024 vp", "Dummy"],
    );

    try {
      const stmt = db.prepare(votingsByDocument);
      const rows = stmt.all({ $identifier: "HE 1/2024 vp" }) as any[];
      stmt.finalize();

      expect(rows.find((row) => row.id === 9100)).toBeUndefined();
    } finally {
      db.run(`DELETE FROM Voting WHERE id = 9100`);
    }
  });

  test("VOTINGS_BY_DOCUMENT resolves votings from exact document_tunnus links", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item, section_title)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        9101,
        2,
        "2024-01-15T13:10:00.000",
        "2024/1",
        "Ei sisalla tunnusta",
        "Dummy",
      ],
    );
    db.run(
      `INSERT INTO SaliDBDocumentReference (source_type, voting_id, section_key, document_tunnus, source_text, source_url, created_datetime, imported_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "voting_item",
        9101,
        null,
        "HE 1/2024 vp",
        "HE 1/2024 vp",
        null,
        null,
        "2024-01-15T13:10:00.000",
      ],
    );

    try {
      const stmt = db.prepare(votingsByDocument);
      const rows = stmt.all({ $identifier: "HE 1/2024 vp" }) as any[];
      stmt.finalize();

      expect(rows.find((row) => row.id === 9101)).toBeDefined();
    } finally {
      db.run(`DELETE FROM SaliDBDocumentReference WHERE voting_id = 9101`);
      db.run(`DELETE FROM Voting WHERE id = 9101`);
    }
  });

  test("VOTING_RELATED_BY_ID does not relate votings only by textual parliamentary_item", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item)
       VALUES (?, ?, ?, ?, ?)`,
      [9301, 1, "2024-01-15T14:00:00.000", "2024/1", "HE 7/2024 vp"],
    );
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item)
       VALUES (?, ?, ?, ?, ?)`,
      [9302, 2, "2024-01-15T14:10:00.000", "2024/1", "HE 7/2024 vp"],
    );
    db.run(
      `INSERT INTO SaliDBDocumentReference (source_type, voting_id, section_key, document_tunnus, source_text, source_url, created_datetime, imported_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "voting_item",
        9301,
        null,
        "HE 7/2024 vp",
        null,
        null,
        null,
        "2024-01-15T14:00:00.000",
      ],
    );
    db.run(
      `INSERT INTO SaliDBDocumentReference (source_type, voting_id, section_key, document_tunnus, source_text, source_url, created_datetime, imported_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "voting_item",
        9302,
        null,
        "HE 8/2024 vp",
        null,
        null,
        null,
        "2024-01-15T14:10:00.000",
      ],
    );

    try {
      const stmt = db.prepare(votingRelatedById);
      const rows = stmt.all({ $id: 9301 }) as any[];
      stmt.finalize();

      expect(rows.find((row) => row.id === 9302)).toBeUndefined();
    } finally {
      db.run(
        `DELETE FROM SaliDBDocumentReference WHERE voting_id IN (9301, 9302)`,
      );
      db.run(`DELETE FROM Voting WHERE id IN (9301, 9302)`);
    }
  });

  test("VOTING_RELATED_BY_ID relates votings sharing exact document_tunnus", () => {
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item)
       VALUES (?, ?, ?, ?, ?)`,
      [9311, 1, "2024-01-15T15:00:00.000", "2024/1", "Teksti A"],
    );
    db.run(
      `INSERT INTO Voting (id, number, start_time, session_key, parliamentary_item)
       VALUES (?, ?, ?, ?, ?)`,
      [9312, 2, "2024-01-15T15:10:00.000", "2024/1", "Teksti B"],
    );
    db.run(
      `INSERT INTO SaliDBDocumentReference (source_type, voting_id, section_key, document_tunnus, source_text, source_url, created_datetime, imported_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "voting_item",
        9311,
        null,
        "HE 9/2024 vp",
        null,
        null,
        null,
        "2024-01-15T15:00:00.000",
      ],
    );
    db.run(
      `INSERT INTO SaliDBDocumentReference (source_type, voting_id, section_key, document_tunnus, source_text, source_url, created_datetime, imported_datetime)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "voting_item",
        9312,
        null,
        "HE 9/2024 vp",
        null,
        null,
        null,
        "2024-01-15T15:10:00.000",
      ],
    );

    try {
      const stmt = db.prepare(votingRelatedById);
      const rows = stmt.all({ $id: 9311 }) as any[];
      stmt.finalize();

      expect(rows.find((row) => row.id === 9312)).toBeDefined();
    } finally {
      db.run(
        `DELETE FROM SaliDBDocumentReference WHERE voting_id IN (9311, 9312)`,
      );
      db.run(`DELETE FROM Voting WHERE id IN (9311, 9312)`);
    }
  });

  test("SECTION_VOTINGS returns votings for a section key", () => {
    const stmt = db.prepare(sectionVotings);
    const rows = stmt.all({ $sectionKey: "2024/1/3" }) as any[];
    stmt.finalize();

    // Our test votings don't have section_key set, so this should be empty
    // This tests that the query executes without error
    expect(Array.isArray(rows)).toBe(true);
  });

  test("CLOSE_VOTES returns votings with small margin", () => {
    const stmt = db.prepare(closeVotes);
    const rows = stmt.all({ $threshold: 10, $limit: 50 }) as any[];
    stmt.finalize();

    // Voting 101 has margin 4 (102-98)
    expect(rows.length).toBeGreaterThan(0);
    const close = rows.find((r: any) => r.id === 101);
    expect(close).toBeDefined();
    expect(close.margin).toBe(4);
    expect(close.n_yes).toBe(102);
    expect(close.n_no).toBe(98);
  });

  test("CLOSE_VOTES excludes votings with large margin", () => {
    const stmt = db.prepare(closeVotes);
    const rows = stmt.all({ $threshold: 3, $limit: 50 }) as any[];
    stmt.finalize();

    // Margin 4 should not appear with threshold 3
    const close = rows.find((r: any) => r.id === 101);
    expect(close).toBeUndefined();
  });

  test("VOTINGS_BROWSE filters and sorts without requiring a text query", () => {
    const stmt = db.prepare(votingsBrowse);
    const rows = stmt.all({
      $query: null,
      $phase: null,
      $session: null,
      $sort: "largest",
      $startDate: null,
      $endDateExclusive: null,
      $limit: 10,
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("context_title");
    expect(rows[0].n_total).toBeGreaterThanOrEqual(
      rows[rows.length - 1].n_total,
    );
  });

  test("voting overview queries expose summary metrics and curated lists", () => {
    const metricsStmt = db.prepare(votingsOverviewMetrics);
    const metrics = metricsStmt.get({
      $startDate: null,
      $endDateExclusive: null,
      $closeThreshold: 10,
    }) as any;
    metricsStmt.finalize();

    const closeStmt = db.prepare(votingsOverviewClose);
    const closeRows = closeStmt.all({
      $startDate: null,
      $endDateExclusive: null,
      $limit: 5,
    }) as any[];
    closeStmt.finalize();

    const turnoutStmt = db.prepare(votingsOverviewTurnout);
    const turnoutRows = turnoutStmt.all({
      $startDate: null,
      $endDateExclusive: null,
      $limit: 5,
    }) as any[];
    turnoutStmt.finalize();

    const phaseStmt = db.prepare(votingsOverviewPhases);
    const phaseRows = phaseStmt.all({
      $startDate: null,
      $endDateExclusive: null,
      $limit: 5,
    }) as any[];
    phaseStmt.finalize();

    const sessionStmt = db.prepare(votingsOverviewSessions);
    const sessionRows = sessionStmt.all({
      $startDate: null,
      $endDateExclusive: null,
      $limit: 5,
    }) as any[];
    sessionStmt.finalize();

    expect(metrics.total_votings).toBeGreaterThan(0);
    expect(metrics.phase_count).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(closeRows)).toBe(true);
    expect(Array.isArray(turnoutRows)).toBe(true);
    expect(Array.isArray(phaseRows)).toBe(true);
    expect(Array.isArray(sessionRows)).toBe(true);
  });
});

// ─── VOTING PARTICIPATION ───────────────────────────────────

describe("Voting participation queries", () => {
  test("VOTING_PARTICIPATION returns participation rates", () => {
    const stmt = db.prepare(votingParticipation);
    const rows = stmt.all({
      $startDate: null,
      $endDateExclusive: null,
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);

    const matti = rows.find((r: any) => r.person_id === 1000);
    expect(matti).toBeDefined();
    expect(matti.votes_cast).toBe(2);
    expect(matti.total_votings).toBe(2);
    expect(matti.participation_rate).toBe(100);

    const pekka = rows.find((r: any) => r.person_id === 1002);
    expect(pekka).toBeDefined();
    expect(pekka.votes_cast).toBe(0);
    expect(pekka.participation_rate).toBe(0);
  });

  test("VOTING_PARTICIPATION filters by date range", () => {
    const stmt = db.prepare(votingParticipation);
    const rows = stmt.all({
      $startDate: "2024-01-15",
      $endDateExclusive: "2024-01-16",
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
  });

  test("VOTING_PARTICIPATION returns empty for date range with no votings", () => {
    const stmt = db.prepare(votingParticipation);
    const rows = stmt.all({
      $startDate: "2099-01-01",
      $endDateExclusive: "2100-01-01",
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── PARLIAMENT COMPOSITION ─────────────────────────────────

describe("Parliament composition query", () => {
  test("CURRENT_COMPOSITION returns active representatives on date", () => {
    const stmt = db.prepare(currentComposition);
    const rows = stmt.all({
      $date: new Date("2024-01-15").toISOString(),
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("person_id");
      expect(row).toHaveProperty("party_name");
    }
  });

  test("CURRENT_COMPOSITION returns empty before term start", () => {
    const stmt = db.prepare(currentComposition);
    const rows = stmt.all({
      $date: new Date("2020-01-01").toISOString(),
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── GOVERNMENT & TRUST POSITIONS ───────────────────────────

describe("Government and trust position queries", () => {
  test("GOVERNMENT_MEMBERSHIPS returns memberships for a person", () => {
    const stmt = db.prepare(governmentMemberships);
    const rows = stmt.all({ $personId: 1002 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].government).toBe("Orpon hallitus");
    expect(rows[0].ministry).toBe("Valtiovarainministeriö");
  });

  test("GOVERNMENT_MEMBERSHIPS returns empty for non-minister", () => {
    const stmt = db.prepare(governmentMemberships);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("TRUST_POSITIONS returns positions for a person", () => {
    const stmt = db.prepare(trustPositions);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Kunnanvaltuuston jäsen");
  });

  test("LEAVING_PARLIAMENT returns records", () => {
    const stmt = db.prepare(leavingParliamentRecords);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Eroilmoitus");
  });
});

// ─── COMMITTEE QUERIES ──────────────────────────────────────

describe("Committee queries", () => {
  test("PERSON_COMMITTEES returns committee memberships with names", () => {
    const stmt = db.prepare(personCommittees);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].committee_name).toBe("Valtiovarainvaliokunta");
    expect(rows[0].role).toBe("jäsen");
  });

  test("COMMITTEE_OVERVIEW returns committees with member counts", () => {
    const stmt = db.prepare(committeeOverview);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    const vav = rows.find((r: any) => r.committee_code === "VaV");
    expect(vav).toBeDefined();
    expect(vav.current_members).toBe(2);
    expect(vav.current_chairs).toContain("Pekka Korhonen");
  });
});

// ─── ANALYTICS: PARTY DISCIPLINE ────────────────────────────

describe("Party discipline query", () => {
  test("PARTY_DISCIPLINE executes and returns discipline rates", () => {
    const stmt = db.prepare(partyDiscipline);
    const rows = stmt.all() as any[];
    stmt.finalize();

    // With only 2 votings per party, may not pass the >100 filter
    // but query should execute without error
    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty("party_name");
      expect(row).toHaveProperty("discipline_rate");
      expect(row.discipline_rate).toBeGreaterThanOrEqual(0);
      expect(row.discipline_rate).toBeLessThanOrEqual(100);
    }
  });
});

// ─── ANALYTICS: COALITION VS OPPOSITION ─────────────────────

describe("Coalition vs opposition query", () => {
  test("COALITION_VS_OPPOSITION splits votes by government membership", () => {
    const stmt = db.prepare(coalitionVsOpposition);
    const rows = stmt.all({ $limit: 50 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("coalition_yes");
      expect(row).toHaveProperty("coalition_no");
      expect(row).toHaveProperty("opposition_yes");
      expect(row).toHaveProperty("opposition_no");
    }
  });
});

// ─── ANALYTICS: DISSENT TRACKING ────────────────────────────

describe("Dissent tracking query", () => {
  test("DISSENT_TRACKING executes without error", () => {
    const stmt = db.prepare(dissentTracking);
    const rows = stmt.all({ $personId: null, $limit: 100 }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty("mp_vote");
      expect(row).toHaveProperty("majority_vote");
      expect(row.mp_vote).not.toBe(row.majority_vote);
    }
  });

  test("PERSON_DISSENTS executes for a specific person", () => {
    const stmt = db.prepare(personDissents);
    const rows = stmt.all({ $personId: 1001, $limit: 100 }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
  });
});

// ─── ANALYTICS: SPEECH ACTIVITY ─────────────────────────────

describe("Speech activity query", () => {
  test("SPEECH_ACTIVITY returns speech counts and word stats", () => {
    const stmt = db.prepare(speechActivity);
    const rows = stmt.all({ $limit: 50 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("speech_count");
      expect(row).toHaveProperty("total_words");
      expect(row).toHaveProperty("avg_words_per_speech");
      expect(row.speech_count).toBeGreaterThan(0);
    }
  });
});

// ─── ANALYTICS: MP ACTIVITY RANKING ─────────────────────────

describe("MP activity ranking query", () => {
  test("MP_ACTIVITY_RANKING returns activity scores", () => {
    const stmt = db.prepare(mpActivityRanking);
    const rows = stmt.all({ $limit: 50 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("activity_score");
      expect(row).toHaveProperty("votes_cast");
      expect(row).toHaveProperty("speech_count");
      expect(row).toHaveProperty("committee_count");
    }

    // Should be sorted by activity_score DESC
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].activity_score).toBeLessThanOrEqual(
        rows[i - 1].activity_score,
      );
    }
  });
});

// ─── ANALYTICS: RECENT ACTIVITY ─────────────────────────────

describe("Recent activity query", () => {
  test("RECENT_ACTIVITY returns session activity summaries", () => {
    const stmt = db.prepare(recentActivity);
    const rows = stmt.all({ $limit: 20 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("date");
      expect(row).toHaveProperty("session_key");
      expect(row).toHaveProperty("section_count");
      expect(row).toHaveProperty("voting_count");
    }
  });
});

// ─── PARTY QUERIES ──────────────────────────────────────────

describe("Party queries", () => {
  test("PARTY_SUMMARY returns party stats", () => {
    const stmt = db.prepare(partySummary);
    const rows = stmt.all({
      $asOfDate: "2024-01-15",
      $startDate: null,
      $endDateExclusive: null,
      $governmentName: null,
      $governmentStartDate: null,
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("party_code");
      expect(row).toHaveProperty("party_name");
      expect(row).toHaveProperty("member_count");
      expect(row.member_count).toBeGreaterThan(0);
    }
  });

  test("PARTY_MEMBERS returns members of a specific party", () => {
    const stmt = db.prepare(partyMembers);
    const rows = stmt.all({
      $partyCode: "kesk",
      $asOfDate: "2024-01-15",
      $startDate: null,
      $endDateExclusive: null,
      $governmentName: null,
      $governmentStartDate: null,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].first_name).toBe("Matti");
    expect(rows[0].last_name).toBe("Meikäläinen");
  });

  test("PARTY_MEMBERS returns empty for non-existent party", () => {
    const stmt = db.prepare(partyMembers);
    const rows = stmt.all({
      $partyCode: "xxx",
      $asOfDate: "2024-01-15",
      $startDate: null,
      $endDateExclusive: null,
      $governmentName: null,
      $governmentStartDate: null,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── FEDERATED SEARCH ───────────────────────────────────────

describe("Federated search query", () => {
  test("FEDERATED_SEARCH finds MPs by name", () => {
    const stmt = db.prepare(federatedSearch);
    const rows = stmt.all({ $q: "Meikäläinen", $limit: 30 }) as any[];
    stmt.finalize();

    const mpResults = rows.filter((r: any) => r.type === "mp");
    expect(mpResults.length).toBeGreaterThan(0);
    expect(mpResults[0].title).toContain("Meikäläinen");
  });

  test("FEDERATED_SEARCH finds votings by section title", () => {
    const stmt = db.prepare(federatedSearch);
    const rows = stmt.all({ $q: "Hallituksen", $limit: 30 }) as any[];
    stmt.finalize();

    const votingResults = rows.filter((r: any) => r.type === "voting");
    expect(votingResults.length).toBeGreaterThan(0);
  });

  test("FEDERATED_SEARCH returns empty for no-match query", () => {
    const stmt = db.prepare(federatedSearch);
    const rows = stmt.all({ $q: "zzzznonexistent", $limit: 30 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

describe("Person search query", () => {
  test("PERSON_SEARCH finds both current and former MPs", () => {
    const tempDb = createTestDb();
    seedFullDataset(tempDb);

    tempDb.run(
      `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1100,
        "Meikäläinen",
        "Mikko",
        "Meikäläinen Mikko",
        "vihr",
        "Mies",
        "1965-02-01",
        0,
      ],
    );
    tempDb.run(`INSERT INTO ParliamentaryGroup (code) VALUES (?)`, ["vihr"]);
    tempDb.run(
      `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1100, 1100, "vihr", "Vihreä eduskuntaryhmä", "2011-04-01", "2015-04-21"],
    );
    tempDb.run(
      `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [1100, 1100, "2011-04-01", "2015-04-21", 2011, 2015],
    );

    const stmt = tempDb.prepare(personSearch);
    const rows = stmt.all({
      $query: "Meikäläinen",
      $exactQuery: "Meikäläinen",
      $prefixQuery: "Meikäläinen%",
      $limit: 20,
      $date: "2024-01-15",
    }) as DatabaseQueries.PersonSearchResult[];
    stmt.finalize();
    tempDb.close();

    expect(rows.map((row) => row.person_id)).toEqual([1000, 1100]);
    expect(rows[0]?.is_current_mp).toBe(1);
    expect(rows[1]?.is_current_mp).toBe(0);
    expect(rows[0]?.is_active_on_selected_date).toBe(1);
    expect(rows[1]?.is_active_on_selected_date).toBe(0);
  });

  test("PERSON_SEARCH returns latest party and term summary", () => {
    const stmt = db.prepare(personSearch);
    const row = stmt.get({
      $query: "Virtanen",
      $exactQuery: "Virtanen",
      $prefixQuery: "Virtanen%",
      $limit: 20,
      $date: null,
    }) as DatabaseQueries.PersonSearchResult | null;
    stmt.finalize();

    expect(row).not.toBeNull();
    expect(row?.latest_party_name).toBe("Sosialidemokraattinen eduskuntaryhmä");
    expect(row?.first_term_start).toBe("2023-04-01");
    expect(row?.last_term_end).toBeNull();
    expect(row?.latest_active_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ─── DEMOGRAPHIC QUERIES ────────────────────────────────────

describe("Demographic queries", () => {
  test("GENDER_DIVISION_OVER_TIME returns gender stats by year", () => {
    const stmt = db.prepare(genderDivisionOverTime);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("year");
      expect(row).toHaveProperty("female_count");
      expect(row).toHaveProperty("male_count");
      expect(row).toHaveProperty("total_count");
      expect(row).toHaveProperty("female_percentage");
      expect(row).toHaveProperty("male_percentage");
      expect(row.female_count + row.male_count).toBe(row.total_count);
    }
  });

  test("AGE_DIVISION_OVER_TIME returns age stats by year", () => {
    const stmt = db.prepare(ageDivisionOverTime);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("year");
      expect(row).toHaveProperty("age_under_30");
      expect(row).toHaveProperty("age_30_39");
      expect(row).toHaveProperty("age_40_49");
      expect(row).toHaveProperty("age_50_59");
      expect(row).toHaveProperty("age_60_plus");
      expect(row).toHaveProperty("average_age");
      expect(row.average_age).toBeGreaterThan(0);
    }
  });
});

// ─── GOVERNMENT-PERIOD QUERIES ──────────────────────────────

describe("Government-period queries", () => {
  test("PARTY_PARTICIPATION_BY_GOVERNMENT returns participation by gov period", () => {
    const stmt = db.prepare(partyParticipationByGovernment);
    const rows = stmt.all({
      $startDate: null,
      $endDateExclusive: null,
    }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty("government");
      expect(row).toHaveProperty("party_name");
      expect(row).toHaveProperty("participation_rate");
      expect(row).toHaveProperty("was_in_coalition");
    }
  });

  test("VOTING_PARTICIPATION_BY_GOVERNMENT returns per-person gov breakdown", () => {
    const stmt = db.prepare(votingParticipationByGovernment);
    const rows = stmt.all({
      $personId: 1000,
      $startDate: null,
      $endDateExclusive: null,
    }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty("government");
      expect(row).toHaveProperty("votes_cast");
      expect(row).toHaveProperty("participation_rate");
    }
  });
});

// ─── SPEECHES BY DATE ───────────────────────────────────────

describe("Speeches by date query", () => {
  test("SPEECHES_BY_DATE returns speeches with section info", () => {
    const stmt = db.prepare(speechesByDate);
    const rows = stmt.all({ $date: "2024-01-15" }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
    for (const row of rows) {
      expect(row).toHaveProperty("content");
      expect(row).toHaveProperty("first_name");
      expect(row).toHaveProperty("last_name");
    }
  });

  test("SPEECHES_BY_DATE returns empty for date with no speeches", () => {
    const stmt = db.prepare(speechesByDate);
    const rows = stmt.all({ $date: "2099-01-01" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── SCHEMA INTEGRITY ───────────────────────────────────────

describe("Schema integrity", () => {
  test("all expected tables exist", () => {
    const tables = db
      .query("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
      .all() as { name: string }[];
    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("Representative");
    expect(tableNames).toContain("Session");
    expect(tableNames).toContain("Agenda");
    expect(tableNames).toContain("Section");
    expect(tableNames).toContain("Voting");
    expect(tableNames).toContain("Vote");
    expect(tableNames).toContain("Speech");
    expect(tableNames).toContain("Term");
    expect(tableNames).toContain("ParliamentaryGroup");
    expect(tableNames).toContain("ParliamentaryGroupMembership");
    expect(tableNames).toContain("Government");
    expect(tableNames).toContain("GovernmentMembership");
    expect(tableNames).toContain("Committee");
    expect(tableNames).toContain("CommitteeMembership");
    expect(tableNames).toContain("TrustPosition");
    expect(tableNames).toContain("District");
    expect(tableNames).toContain("RepresentativeDistrict");
    expect(tableNames).toContain("SectionDocumentLink");
    expect(tableNames).toContain("SessionNotice");
    expect(tableNames).toContain("SaliDBDocumentReference");
  });

  test("foreign key constraints are enforced", () => {
    const result = db.query("PRAGMA foreign_keys").get() as any;
    expect(result.foreign_keys).toBe(1);
  });

  test("analytics indexes exist", () => {
    const indexes = db
      .query(
        "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
      )
      .all() as { name: string }[];
    const indexNames = indexes.map((i) => i.name);

    expect(indexNames).toContain("idx_vote_group");
    expect(indexNames).toContain("idx_vote_vote");
    expect(indexNames).toContain("idx_vote_group_vote");
    expect(indexNames).toContain("idx_voting_start_time");
    expect(indexNames).toContain("idx_vote_person_voting");
    expect(indexNames).toContain("idx_vote_voting_id");
  });
});

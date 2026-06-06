import type { Database } from "bun:sqlite";
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import closeVotes from "../src/features/analytics/sql/analytics-close-votes.sql";
import coalitionVsOpposition from "../src/features/analytics/sql/analytics-coalition-opposition.sql";
import partyDiscipline from "../src/features/analytics/sql/analytics-party-discipline.sql";
import partyMembers from "../src/features/analytics/sql/analytics-party-members.sql";
import partySummary from "../src/features/analytics/sql/analytics-party-summary.sql";
import personCommittees from "../src/features/person/sql/person-committees.sql";
import personDissents from "../src/features/person/sql/person-dissents.sql";
import personGroupMemberships from "../src/features/person/sql/person-group-memberships.sql";
import personQuestions from "../src/features/person/sql/person-questions.sql";
import personSpeeches from "../src/features/person/sql/person-speeches.sql";
import personTerms from "../src/features/person/sql/person-terms.sql";
import recentActivity from "../src/features/analytics/sql/analytics-recent-activity.sql";
import representativeDetails from "../src/features/person/sql/person-detail.sql";
import representativeDistricts from "../src/features/person/sql/person-districts.sql";
import sectionDocumentLinks from "../src/features/session/sql/session-section-documents.sql";
import sectionSpeechCount from "../src/features/session/sql/session-section-speech-count.sql";
import sectionSpeeches from "../src/features/session/sql/session-section-speeches.sql";
import sectionVotings from "../src/features/session/sql/session-section-votings.sql";
import sessionByDate from "../src/features/session/sql/session-by-date.sql";
import sessionNotices from "../src/features/session/sql/session-notices.sql";
import sessionSectionsBySessionKeys from "../src/features/session/sql/session-sections.sql";
import speechActivity from "../src/features/analytics/sql/analytics-speech-activity.sql";
import votesByPerson from "../src/features/person/sql/person-votes.sql";
import votingRelatedById from "../src/features/voting/sql/voting-related.sql";
import votingsBrowse from "../src/features/voting/sql/voting-list.sql";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";

const queries = {
  closeVotes,
  coalitionVsOpposition,
  partyDiscipline,
  partyMembers,
  partySummary,
  personCommittees,
  personDissents,
  personGroupMemberships,
  personQuestions,
  personSpeeches,
  personTerms,
  recentActivity,
  representativeDetails,
  representativeDistricts,
  sectionDocumentLinks,
  sectionSpeechCount,
  sectionSpeeches,
  sectionVotings,
  sessionByDate,
  sessionNotices,
  sessionSectionsBySessionKeys,
  speechActivity,
  votesByPerson,
  votingsBrowse,
  votingRelatedById,
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

  test("PERSON_QUESTIONS does not duplicate first signers present in signer rows", () => {
    try {
      db.run(
        `INSERT INTO Interpellation (
           id,
           parliament_identifier,
           document_number,
           parliamentary_year,
           title,
           submission_date,
           first_signer_person_id,
           first_signer_first_name,
           first_signer_last_name,
           first_signer_party,
           co_signer_count,
           source_path
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          81011,
          "VK 11/2024 vp",
          11,
          "2024",
          "Ensisijainen allekirjoittaja",
          "2024-03-01",
          1000,
          "Matti",
          "Meikäläinen",
          "kesk",
          0,
          "test",
        ],
      );
      db.run(
        `INSERT INTO InterpellationSigner (
           interpellation_id,
           signer_order,
           person_id,
           first_name,
           last_name,
           party,
           is_first_signer
         ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [81011, 1, 1000, "Matti", "Meikäläinen", "kesk", 1],
      );

      const stmt = db.prepare(personQuestions);
      const rows = stmt.all({ $personId: 1000, $limit: 100 }) as any[];
      stmt.finalize();

      const matches = rows.filter(
        (row: any) => row.parliament_identifier === "VK 11/2024 vp",
      );
      expect(matches).toHaveLength(1);
      expect(matches[0].relation_role).toBe("first_signer");
    } finally {
      db.run(
        `DELETE FROM InterpellationSigner WHERE interpellation_id = ?`,
        [81011],
      );
      db.run(`DELETE FROM Interpellation WHERE id = ?`, [81011]);
    }
  });
});

// ─── SESSION QUERIES ────────────────────────────────────────

describe("Session queries", () => {
  test("SESSION_SECTIONS_BY_SESSION_KEYS returns sections for a session", () => {
    const stmt = db.prepare(sessionSectionsBySessionKeys);
    const rows = stmt.all({
      $sessionKeysJson: JSON.stringify(["2024/1"]),
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].ordinal).toBe(3);
    expect(rows[1].ordinal).toBe(4);
  });

  test("SESSION_SECTIONS_BY_SESSION_KEYS returns empty for non-existent session", () => {
    const stmt = db.prepare(sessionSectionsBySessionKeys);
    const rows = stmt.all({
      $sessionKeysJson: JSON.stringify(["nonexistent"]),
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("SESSION_SECTIONS_BY_SESSION_KEYS keeps legacy document fields null", () => {
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

      const stmt = db.prepare(sessionSectionsBySessionKeys);
      const rows = stmt.all({
        $sessionKeysJson: JSON.stringify(["2025/136"]),
      }) as any[];
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
});

// ─── VOTING PARTICIPATION ───────────────────────────────────

// ─── PARLIAMENT COMPOSITION ─────────────────────────────────

// ─── GOVERNMENT & TRUST POSITIONS ───────────────────────────

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
      expect(row).toHaveProperty("party_display_code");
      expect(row).toHaveProperty("party_name");
      expect(row).toHaveProperty("member_count");
      expect(row).toHaveProperty("votes_cast");
      expect(row).toHaveProperty("total_votings");
      expect(row.total_votings).toBeGreaterThan(0);
      expect(row.member_count).toBeGreaterThan(0);
    }
  });

  test("PARTY_SUMMARY maps votes by membership active on the voting date", () => {
    db.run(
      `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1999,
        "Vornanen",
        "Timo",
        "Vornanen Timo",
        "tv",
        "Mies",
        "1980-01-01",
        0,
      ],
    );
    db.run(
      `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [99, 1999, "2024-01-01", null, 2024, null],
    );
    db.run(`INSERT INTO ParliamentaryGroup (code) VALUES (?)`, ["pg61"]);
    db.run(
      `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [99, 1999, "pg61", "Eduskuntaryhmä Timo Vornanen", "2024-05-23", null],
    );
    db.run(`INSERT INTO Voting (id, start_time) VALUES (?, ?)`, [
      99,
      "2024-05-24T12:00:00",
    ]);
    db.run(
      `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation)
       VALUES (?, ?, ?, ?, ?)`,
      [99, 99, 1999, "Jaa", "tv"],
    );

    const stmt = db.prepare(partySummary);
    const rows = stmt.all({
      $asOfDate: "2024-05-24",
      $startDate: "2024-05-23",
      $endDateExclusive: null,
      $governmentName: null,
      $governmentStartDate: null,
    }) as any[];
    stmt.finalize();

    const vornanenGroup = rows.find((row: any) => row.party_code === "pg61");
    expect(vornanenGroup).toBeDefined();
    expect(vornanenGroup.party_display_code).toBe("tv");
    expect(vornanenGroup.votes_cast).toBe(1);
    expect(vornanenGroup.total_votings).toBe(1);
    expect(vornanenGroup.participation_rate).toBe(100);
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

// ─── DEMOGRAPHIC QUERIES ────────────────────────────────────

// ─── GOVERNMENT-PERIOD QUERIES ──────────────────────────────

// ─── SPEECHES BY DATE ───────────────────────────────────────

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
    expect(indexNames).toContain("idx_vote_person_covering");
    expect(indexNames).toContain("idx_vote_voting_id");
  });
});

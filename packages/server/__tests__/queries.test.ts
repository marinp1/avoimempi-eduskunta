import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { Database } from "bun:sqlite";
import { createTestDb, seedFullDataset } from "./helpers/setup-db";
import * as queries from "../database/queries";

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
    const stmt = db.prepare(
      queries.sql`SELECT * FROM Representative LIMIT $limit OFFSET $offset`,
    );
    const rows = stmt.all({ $limit: 10, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("person_id");
    expect(rows[0]).toHaveProperty("first_name");
    expect(rows[0]).toHaveProperty("last_name");
  });

  test("REPRESENTATIVE_DETAILS returns single rep by id", () => {
    const stmt = db.prepare(queries.representativeDetails);
    const row = stmt.get({ $personId: 1000 }) as any;
    stmt.finalize();

    expect(row).not.toBeNull();
    expect(row.person_id).toBe(1000);
    expect(row.first_name).toBe("Matti");
    expect(row.last_name).toBe("Meikäläinen");
  });

  test("REPRESENTATIVE_DETAILS returns null for non-existent id", () => {
    const stmt = db.prepare(queries.representativeDetails);
    const row = stmt.get({ $personId: 9999 });
    stmt.finalize();

    expect(row).toBeNull();
  });

  test("REPRESENTATIVE_DISTRICTS returns districts with names", () => {
    const stmt = db.prepare(queries.representativeDistricts);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].district_name).toBe("Helsingin vaalipiiri");
    expect(rows[0].person_id).toBe(1000);
  });

  test("REPRESENTATIVE_DISTRICTS returns empty for non-existent id", () => {
    const stmt = db.prepare(queries.representativeDistricts);
    const rows = stmt.all({ $personId: 9999 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── GROUP MEMBERSHIP QUERIES ───────────────────────────────

describe("Group membership queries", () => {
  test("returns group memberships for a person", () => {
    const stmt = db.prepare(
      queries.sql`SELECT pgm.* FROM Representative r JOIN ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id WHERE r.person_id = $personId ORDER BY start_date ASC;`,
    );
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].group_name).toBe("Keskustan eduskuntaryhmä");
  });
});

// ─── TERM QUERIES ───────────────────────────────────────────

describe("Term queries", () => {
  test("returns terms for a person", () => {
    const stmt = db.prepare(
      queries.sql`SELECT t.* FROM Representative r JOIN term t ON r.person_id = t.person_id WHERE r.person_id = $personId ORDER BY t.start_date ASC;`,
    );
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
    const stmt = db.prepare(queries.votesByPerson);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].start_time).toBe("2024-01-15T11:00:00");
    expect(rows[0].vote).toBe("Jaa");
    expect(rows[0].group_abbreviation).toBe("kesk");
  });

  test("returns empty for person with no votes", () => {
    const stmt = db.prepare(queries.votesByPerson);
    const rows = stmt.all({ $personId: 9999 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── SESSION QUERIES ────────────────────────────────────────

describe("Session queries", () => {
  test("SESSIONS returns all sessions with agenda info", () => {
    const stmt = db.prepare(queries.sessions);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveProperty("agenda_title");
    expect(rows[0]).toHaveProperty("agenda_state");
  });

  test("SESSIONS_PAGINATED respects limit and offset", () => {
    const stmt = db.prepare(queries.sessionsPaginated);
    const rows = stmt.all({ $limit: 1, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("2024/2");
  });

  test("SESSION_SECTIONS returns sections for a session", () => {
    const stmt = db.prepare(queries.sessionSections);
    const rows = stmt.all({ $sessionKey: "2024/1" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].ordinal).toBe(3);
    expect(rows[1].ordinal).toBe(4);
  });

  test("SESSION_SECTIONS returns empty for non-existent session", () => {
    const stmt = db.prepare(queries.sessionSections);
    const rows = stmt.all({ $sessionKey: "nonexistent" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("SESSION_BY_DATE returns sessions on a specific date", () => {
    const stmt = db.prepare(queries.sessionByDate);
    const rows = stmt.all({ $date: "2024-01-15" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].key).toBe("2024/1");
    expect(rows[0]).toHaveProperty("agenda_title");
  });

  test("SESSION_BY_DATE returns empty for date with no sessions", () => {
    const stmt = db.prepare(queries.sessionByDate);
    const rows = stmt.all({ $date: "2099-01-01" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("SESSION_DATES returns distinct dates in descending order", () => {
    const stmt = db.prepare(queries.sessionDates);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    expect(rows[0].date).toBe("2024-01-16");
    expect(rows[1].date).toBe("2024-01-15");
  });
});

// ─── SPEECH QUERIES ─────────────────────────────────────────

describe("Speech queries", () => {
  test("SECTION_SPEECHES returns speeches with content from VaskiMinutesSpeech join", () => {
    const stmt = db.prepare(queries.sectionSpeeches);
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

  test("SECTION_SPEECHES returns empty for non-existent section", () => {
    const stmt = db.prepare(queries.sectionSpeeches);
    const rows = stmt.all({
      $sectionKey: "nonexistent",
      $limit: 20,
      $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("PERSON_SPEECHES returns speeches by person with word count", () => {
    const stmt = db.prepare(queries.personSpeeches);
    const rows = stmt.all({ $personId: 1000, $limit: 50, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveProperty("word_count");
    expect(rows[0].word_count).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("content");
  });
});

// ─── VOTING QUERIES ─────────────────────────────────────────

describe("Voting queries", () => {
  test("SECTION_VOTINGS returns votings for a section key", () => {
    const stmt = db.prepare(queries.sectionVotings);
    const rows = stmt.all({ $sectionKey: "2024/1/3" }) as any[];
    stmt.finalize();

    // Our test votings don't have section_key set, so this should be empty
    // This tests that the query executes without error
    expect(Array.isArray(rows)).toBe(true);
  });

  test("CLOSE_VOTES returns votings with small margin", () => {
    const stmt = db.prepare(queries.closeVotes);
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
    const stmt = db.prepare(queries.closeVotes);
    const rows = stmt.all({ $threshold: 3, $limit: 50 }) as any[];
    stmt.finalize();

    // Margin 4 should not appear with threshold 3
    const close = rows.find((r: any) => r.id === 101);
    expect(close).toBeUndefined();
  });
});

// ─── VOTING PARTICIPATION ───────────────────────────────────

describe("Voting participation queries", () => {
  test("VOTING_PARTICIPATION returns participation rates", () => {
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({ $startDate: null, $endDate: null }) as any[];
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
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({ $startDate: "2024-01-15", $endDate: "2024-01-15" }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
  });

  test("VOTING_PARTICIPATION returns empty for date range with no votings", () => {
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({ $startDate: "2099-01-01", $endDate: "2099-12-31" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── PARLIAMENT COMPOSITION ─────────────────────────────────

describe("Parliament composition query", () => {
  test("CURRENT_COMPOSITION returns active representatives on date", () => {
    const stmt = db.prepare(queries.currentComposition);
    const rows = stmt.all({ $date: new Date("2024-01-15").toISOString() }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    for (const row of rows) {
      expect(row).toHaveProperty("person_id");
      expect(row).toHaveProperty("party_name");
    }
  });

  test("CURRENT_COMPOSITION returns empty before term start", () => {
    const stmt = db.prepare(queries.currentComposition);
    const rows = stmt.all({ $date: new Date("2020-01-01").toISOString() }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── GOVERNMENT & TRUST POSITIONS ───────────────────────────

describe("Government and trust position queries", () => {
  test("GOVERNMENT_MEMBERSHIPS returns memberships for a person", () => {
    const stmt = db.prepare(queries.governmentMemberships);
    const rows = stmt.all({ $personId: 1002 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].government).toBe("Orpon hallitus");
    expect(rows[0].ministry).toBe("Valtiovarainministeriö");
  });

  test("GOVERNMENT_MEMBERSHIPS returns empty for non-minister", () => {
    const stmt = db.prepare(queries.governmentMemberships);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });

  test("TRUST_POSITIONS returns positions for a person", () => {
    const stmt = db.prepare(queries.trustPositions);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe("Kunnanvaltuuston jäsen");
  });

  test("LEAVING_PARLIAMENT returns records", () => {
    const stmt = db.prepare(queries.leavingParliamentRecords);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].description).toBe("Eroilmoitus");
  });
});

// ─── COMMITTEE QUERIES ──────────────────────────────────────

describe("Committee queries", () => {
  test("PERSON_COMMITTEES returns committee memberships with names", () => {
    const stmt = db.prepare(queries.personCommittees);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].committee_name).toBe("Valtiovarainvaliokunta");
    expect(rows[0].role).toBe("jäsen");
  });

  test("COMMITTEE_OVERVIEW returns committees with member counts", () => {
    const stmt = db.prepare(queries.committeeOverview);
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
    const stmt = db.prepare(queries.partyDiscipline);
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
    const stmt = db.prepare(queries.coalitionVsOpposition);
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
    const stmt = db.prepare(queries.dissentTracking);
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
    const stmt = db.prepare(queries.personDissents);
    const rows = stmt.all({ $personId: 1001, $limit: 100 }) as any[];
    stmt.finalize();

    expect(Array.isArray(rows)).toBe(true);
  });
});

// ─── ANALYTICS: SPEECH ACTIVITY ─────────────────────────────

describe("Speech activity query", () => {
  test("SPEECH_ACTIVITY returns speech counts and word stats", () => {
    const stmt = db.prepare(queries.speechActivity);
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
    const stmt = db.prepare(queries.mpActivityRanking);
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
      expect(rows[i].activity_score).toBeLessThanOrEqual(rows[i - 1].activity_score);
    }
  });
});

// ─── ANALYTICS: RECENT ACTIVITY ─────────────────────────────

describe("Recent activity query", () => {
  test("RECENT_ACTIVITY returns session activity summaries", () => {
    const stmt = db.prepare(queries.recentActivity);
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
    const stmt = db.prepare(queries.partySummary);
    const rows = stmt.all() as any[];
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
    const stmt = db.prepare(queries.partyMembers);
    const rows = stmt.all({ $partyCode: "kesk" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].first_name).toBe("Matti");
    expect(rows[0].last_name).toBe("Meikäläinen");
  });

  test("PARTY_MEMBERS returns empty for non-existent party", () => {
    const stmt = db.prepare(queries.partyMembers);
    const rows = stmt.all({ $partyCode: "xxx" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── DOCUMENT QUERIES ───────────────────────────────────────

describe("Document queries", () => {
  test("DOCUMENTS_SEARCH returns documents with subjects", () => {
    const stmt = db.prepare(queries.documentsSearch);
    const rows = stmt.all({
      $q: null, $type: null, $year: null, $limit: 50, $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    const he = rows.find((r: any) => r.document_type_code === "HE");
    expect(he).toBeDefined();
    expect(he.subjects).toContain("verotus");
  });

  test("DOCUMENTS_SEARCH filters by query string", () => {
    const stmt = db.prepare(queries.documentsSearch);
    const rows = stmt.all({
      $q: "laiksi", $type: null, $year: null, $limit: 50, $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].title).toContain("laiksi");
  });

  test("DOCUMENTS_SEARCH filters by type", () => {
    const stmt = db.prepare(queries.documentsSearch);
    const rows = stmt.all({
      $q: null, $type: "HE", $year: null, $limit: 50, $offset: 0,
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    expect(rows[0].document_type_code).toBe("HE");
  });

  test("DOCUMENTS_BY_TYPE returns type counts", () => {
    const stmt = db.prepare(queries.documentsByType);
    const rows = stmt.all() as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    for (const row of rows) {
      expect(row).toHaveProperty("document_type_code");
      expect(row).toHaveProperty("document_count");
      expect(row.document_count).toBeGreaterThan(0);
    }
  });

  test("DOCUMENT_DETAIL returns full document with subjects", () => {
    const stmt = db.prepare(queries.documentDetail);
    const row = stmt.get({ $id: 1 }) as any;
    stmt.finalize();

    expect(row).not.toBeNull();
    expect(row.eduskunta_tunnus).toBe("HE 1/2024");
    expect(row.subjects).toContain("verotus");
    expect(row.subjects).toContain("talous");
  });

  test("DOCUMENT_DETAIL returns null for non-existent id", () => {
    const stmt = db.prepare(queries.documentDetail);
    const row = stmt.get({ $id: 9999 });
    stmt.finalize();

    expect(row).toBeNull();
  });
});

// ─── FEDERATED SEARCH ───────────────────────────────────────

describe("Federated search query", () => {
  test("FEDERATED_SEARCH finds MPs by name", () => {
    const stmt = db.prepare(queries.federatedSearch);
    const rows = stmt.all({ $q: "Meikäläinen", $limit: 30 }) as any[];
    stmt.finalize();

    const mpResults = rows.filter((r: any) => r.type === "mp");
    expect(mpResults.length).toBeGreaterThan(0);
    expect(mpResults[0].title).toContain("Meikäläinen");
  });

  test("FEDERATED_SEARCH finds documents by title", () => {
    const stmt = db.prepare(queries.federatedSearch);
    const rows = stmt.all({ $q: "laiksi", $limit: 30 }) as any[];
    stmt.finalize();

    const docResults = rows.filter((r: any) => r.type === "document");
    expect(docResults.length).toBeGreaterThan(0);
  });

  test("FEDERATED_SEARCH finds votings by section title", () => {
    const stmt = db.prepare(queries.federatedSearch);
    const rows = stmt.all({ $q: "Hallituksen", $limit: 30 }) as any[];
    stmt.finalize();

    const votingResults = rows.filter((r: any) => r.type === "voting");
    expect(votingResults.length).toBeGreaterThan(0);
  });

  test("FEDERATED_SEARCH returns empty for no-match query", () => {
    const stmt = db.prepare(queries.federatedSearch);
    const rows = stmt.all({ $q: "zzzznonexistent", $limit: 30 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

// ─── DEMOGRAPHIC QUERIES ────────────────────────────────────

describe("Demographic queries", () => {
  test("GENDER_DIVISION_OVER_TIME returns gender stats by year", () => {
    const stmt = db.prepare(queries.genderDivisionOverTime);
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
    const stmt = db.prepare(queries.ageDivisionOverTime);
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
    const stmt = db.prepare(queries.partyParticipationByGovernment);
    const rows = stmt.all({ $startDate: null, $endDate: null }) as any[];
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
    const stmt = db.prepare(queries.votingParticipationByGovernment);
    const rows = stmt.all({
      $personId: 1000, $startDate: null, $endDate: null,
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
    const stmt = db.prepare(queries.speechesByDate);
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
    const stmt = db.prepare(queries.speechesByDate);
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
    expect(tableNames).toContain("VaskiMinutesSpeech");
    expect(tableNames).toContain("Term");
    expect(tableNames).toContain("ParliamentaryGroup");
    expect(tableNames).toContain("ParliamentaryGroupMembership");
    expect(tableNames).toContain("GovernmentMembership");
    expect(tableNames).toContain("Committee");
    expect(tableNames).toContain("CommitteeMembership");
    expect(tableNames).toContain("TrustPosition");
    expect(tableNames).toContain("District");
    expect(tableNames).toContain("RepresentativeDistrict");
    expect(tableNames).toContain("VaskiDocument");
    expect(tableNames).toContain("VaskiSubject");
    expect(tableNames).toContain("VaskiRelationship");
  });

  test("foreign key constraints are enforced", () => {
    const result = db.query("PRAGMA foreign_keys").get() as any;
    expect(result.foreign_keys).toBe(1);
  });

  test("analytics indexes exist", () => {
    const indexes = db
      .query("SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY name")
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

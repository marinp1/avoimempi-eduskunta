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
});

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

  test("returns empty array for person with no memberships", () => {
    // First add a rep without memberships
    db.run(
      `INSERT OR IGNORE INTO Representative (person_id, last_name, first_name, sort_name, party, gender, minister)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [9998, "Tuntematon", "Testi", "Tuntematon Testi", null, "mies", 0],
    );

    const stmt = db.prepare(
      queries.sql`SELECT pgm.* FROM Representative r JOIN ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id WHERE r.person_id = $personId ORDER BY start_date ASC;`,
    );
    const rows = stmt.all({ $personId: 9998 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

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

describe("Votes by person queries", () => {
  test("VOTES_BY_PERSON returns votes with voting details", () => {
    const stmt = db.prepare(queries.votesByPerson);
    const rows = stmt.all({ $personId: 1000 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    // Should be ordered by start_time DESC
    expect(rows[0].start_time).toBe("2024-01-15T11:00:00");
    expect(rows[0].vote).toBe("Jaa");
    expect(rows[1].start_time).toBe("2024-01-15T10:00:00");
    expect(rows[1].vote).toBe("Jaa");
  });

  test("returns empty for person with no votes", () => {
    const stmt = db.prepare(queries.votesByPerson);
    const rows = stmt.all({ $personId: 9999 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

describe("Session queries", () => {
  test("SESSIONS_PAGINATED returns sessions with agenda info", () => {
    const stmt = db.prepare(queries.sessionsPaginated);
    const rows = stmt.all({ $limit: 10, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
    expect(rows[0]).toHaveProperty("key");
    expect(rows[0]).toHaveProperty("agenda_title");
    expect(rows[0]).toHaveProperty("agenda_state");
  });

  test("SESSIONS_PAGINATED respects limit and offset", () => {
    const stmt = db.prepare(queries.sessionsPaginated);
    const rows = stmt.all({ $limit: 1, $offset: 0 }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(1);
    // Ordered by date DESC, so session 2 should come first
    expect(rows[0].key).toBe("2024/2");
  });

  test("SESSION_SECTIONS returns sections for a session", () => {
    const stmt = db.prepare(queries.sessionSections);
    const rows = stmt.all({ $sessionKey: "2024/1" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(2);
    // Ordered by ordinal ASC
    expect(rows[0].ordinal).toBe(3);
    expect(rows[1].ordinal).toBe(4);
  });

  test("SESSION_SECTIONS returns empty for non-existent session", () => {
    const stmt = db.prepare(queries.sessionSections);
    const rows = stmt.all({ $sessionKey: "nonexistent" }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

describe("Voting participation queries", () => {
  test("VOTING_PARTICIPATION returns participation rates", () => {
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({
      $startDate: null,
      $endDate: null,
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);

    // Each row should have participation fields
    for (const row of rows) {
      expect(row).toHaveProperty("person_id");
      expect(row).toHaveProperty("votes_cast");
      expect(row).toHaveProperty("total_votings");
      expect(row).toHaveProperty("participation_rate");
    }

    // Matti voted Jaa twice (100% participation)
    const matti = rows.find((r: any) => r.person_id === 1000);
    expect(matti).toBeDefined();
    expect(matti.votes_cast).toBe(2);
    expect(matti.total_votings).toBe(2);
    expect(matti.participation_rate).toBe(100);

    // Pekka was Poissa twice (0% participation)
    const pekka = rows.find((r: any) => r.person_id === 1002);
    expect(pekka).toBeDefined();
    expect(pekka.votes_cast).toBe(0);
    expect(pekka.total_votings).toBe(2);
    expect(pekka.participation_rate).toBe(0);
  });

  test("VOTING_PARTICIPATION filters by date range", () => {
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({
      $startDate: "2024-01-15",
      $endDate: "2024-01-15",
    }) as any[];
    stmt.finalize();

    expect(rows.length).toBeGreaterThan(0);
  });

  test("VOTING_PARTICIPATION returns empty for date range with no votings", () => {
    const stmt = db.prepare(queries.votingParticipation);
    const rows = stmt.all({
      $startDate: "2099-01-01",
      $endDate: "2099-12-31",
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

describe("Parliament composition query", () => {
  test("CURRENT_COMPOSITION returns active representatives on date", () => {
    const stmt = db.prepare(queries.currentComposition);
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
    const stmt = db.prepare(queries.currentComposition);
    const rows = stmt.all({
      $date: new Date("2020-01-01").toISOString(),
    }) as any[];
    stmt.finalize();

    expect(rows).toHaveLength(0);
  });
});

describe("Schema integrity", () => {
  test("all expected tables exist", () => {
    const tables = db
      .query(
        "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      )
      .all() as { name: string }[];

    const tableNames = tables.map((t) => t.name);

    expect(tableNames).toContain("Representative");
    expect(tableNames).toContain("Session");
    expect(tableNames).toContain("Agenda");
    expect(tableNames).toContain("Section");
    expect(tableNames).toContain("Voting");
    expect(tableNames).toContain("Vote");
    expect(tableNames).toContain("Speech");
    expect(tableNames).toContain("ExcelSpeech");
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
    expect(tableNames).toContain("DocumentSubject");
    expect(tableNames).toContain("DocumentRelationship");
  });

  test("foreign key constraints are enforced", () => {
    // FK check: inserting a vote with non-existent voting_id should not error
    // because we use INSERT OR IGNORE pattern, but let's verify FK pragma is on
    const result = db.query("PRAGMA foreign_keys").get() as any;
    expect(result.foreign_keys).toBe(1);
  });

  test("indexes exist for performance-critical queries", () => {
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
  });
});

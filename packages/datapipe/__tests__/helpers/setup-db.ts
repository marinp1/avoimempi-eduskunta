import { Database } from "bun:sqlite";
import { join } from "node:path";
import { getMigrations, migrate } from "bun-sqlite-migrations";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrator/migrations");

export function applyMigrations(db: Database, upToVersion = 12) {
  migrate(db, getMigrations(MIGRATIONS_DIR), upToVersion);
}

/**
 * Create an in-memory SQLite database with schema applied.
 */
export function createTestDb(
  upToVersion = 12,
  options?: { foreignKeys?: boolean },
): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL;");
  // Migrator tests disable FK checks (matching real migration behavior)
  if (options?.foreignKeys !== false) {
    db.exec("PRAGMA foreign_keys = OFF;");
  } else {
    db.exec("PRAGMA foreign_keys = ON;");
  }
  applyMigrations(db, upToVersion);
  return db;
}

/**
 * Insert a sample representative.
 */
export function seedRepresentative(
  db: Database,
  overrides: Partial<{
    person_id: number;
    last_name: string;
    first_name: string;
    sort_name: string;
    party: string;
    gender: string;
    birth_date: string;
  }> = {},
) {
  const defaults = {
    person_id: 1000,
    last_name: "Meikäläinen",
    first_name: "Matti",
    sort_name: "Meikäläinen Matti",
    party: "kesk",
    gender: "mies",
    birth_date: "1970-01-15",
    minister: 0,
  };
  const row = { ...defaults, ...overrides };
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.person_id,
      row.last_name,
      row.first_name,
      row.sort_name,
      row.party,
      row.gender,
      row.birth_date,
      row.minister,
    ],
  );
  return row;
}

/**
 * Insert a sample agenda + session.
 */
export function seedSession(
  db: Database,
  overrides: Partial<{
    id: number;
    key: string;
    number: number;
    date: string;
    year: number;
    agenda_key: string;
    agenda_title: string;
  }> = {},
) {
  const defaults = {
    id: 1,
    key: "2024/1",
    number: 1,
    date: "2024-01-15",
    year: 2024,
    type: "varsinainen",
    state: "Päättynyt",
    agenda_key: "PJ_2024_1",
    agenda_title: "Täysistunnon päiväjärjestys",
  };
  const row = { ...defaults, ...overrides };

  db.run(`INSERT OR IGNORE INTO Agenda (key, title, state) VALUES (?, ?, ?)`, [
    row.agenda_key,
    row.agenda_title,
    "Valmis",
  ]);

  db.run(
    `INSERT INTO Session (id, number, key, date, year, type, state, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.number,
      row.key,
      row.date,
      row.year,
      row.type,
      row.state,
      row.agenda_key,
    ],
  );
  return row;
}

/**
 * Insert a sample voting record.
 */
export function seedVoting(
  db: Database,
  overrides: Partial<{
    id: number;
    number: number;
    session_key: string;
    start_time: string;
    n_yes: number;
    n_no: number;
    n_absent: number;
  }> = {},
) {
  const defaults = {
    id: 100,
    number: 1,
    session_key: "2024/1",
    start_time: "2024-01-15T10:00:00",
    annulled: 0,
    title: "Äänestys hallituksen esityksestä",
    n_yes: 100,
    n_no: 50,
    n_abstain: 5,
    n_absent: 45,
    n_total: 200,
    section_title: "Hallituksen esitys",
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Voting (id, number, session_key, start_time, annulled, title, n_yes, n_no, n_abstain, n_absent, n_total, section_title)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.number,
      row.session_key,
      row.start_time,
      row.annulled,
      row.title,
      row.n_yes,
      row.n_no,
      row.n_abstain,
      row.n_absent,
      row.n_total,
      row.section_title,
    ],
  );
  return row;
}

/**
 * Insert a sample vote (individual representative's vote).
 */
export function seedVote(
  db: Database,
  overrides: Partial<{
    id: number;
    voting_id: number;
    person_id: number;
    vote: string;
    group_abbreviation: string;
  }> = {},
) {
  const defaults = {
    id: 5000,
    voting_id: 100,
    person_id: 1000,
    vote: "Jaa",
    group_abbreviation: "kesk",
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation)
     VALUES (?, ?, ?, ?, ?)`,
    [row.id, row.voting_id, row.person_id, row.vote, row.group_abbreviation],
  );
  return row;
}

/**
 * Insert a sample section.
 */
export function seedSection(
  db: Database,
  overrides: Partial<{
    id: number;
    key: string;
    title: string;
    identifier: string | null;
    session_key: string;
    ordinal: number;
    vaski_id: number | null;
  }> = {},
) {
  const defaults = {
    id: 10,
    key: "2024/1/3",
    title: "Hallituksen esitys eduskunnalle",
    identifier: null as string | null,
    session_key: "2024/1",
    ordinal: 3,
    vaski_id: null as number | null,
    processing_title: "Ainoa käsittely",
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Section (id, key, identifier, title, session_key, ordinal, processing_title, vaski_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.key,
      row.identifier,
      row.title,
      row.session_key,
      row.ordinal,
      row.processing_title,
      row.vaski_id,
    ],
  );
  return row;
}

/**
 * Insert a sample speech.
 */
export function seedSpeech(
  db: Database,
  overrides: Partial<{
    id: number;
    key: string;
    session_key: string;
    section_key: string;
    ordinal: number;
    ordinal_number: number;
    speech_type: string;
    request_method: string;
    request_time: string;
    person_id: number;
    first_name: string;
    last_name: string;
    gender: string;
    party_abbreviation: string | null;
    has_spoken: number;
    ministry: string | null;
    modified_datetime: string;
    created_datetime: string | null;
    imported_datetime: string | null;
    ad_tunnus: string | null;
    order_raw: string | null;
  }> = {},
) {
  const defaults = {
    id: 10000,
    key: "speech-10000",
    session_key: "2024/1",
    section_key: "2024/1/3",
    ordinal: 20240115100000,
    ordinal_number: 1,
    speech_type: "T",
    request_method: "I",
    request_time: "2024-01-15T10:00:00",
    person_id: 1000,
    first_name: "Matti",
    last_name: "Meikäläinen",
    gender: "mies",
    party_abbreviation: "kesk",
    has_spoken: 1,
    ministry: null as string | null,
    modified_datetime: "2024-01-15T10:00:00",
    created_datetime: "2024-01-15T10:00:00",
    imported_datetime: "2024-01-15T10:00:00",
    ad_tunnus: null as string | null,
    order_raw: "2024-01-15 10:00:00",
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Speech (id, key, session_key, section_key, ordinal, ordinal_number, speech_type, request_method, request_time, person_id, first_name, last_name, gender, party_abbreviation, has_spoken, ministry, modified_datetime, created_datetime, imported_datetime, ad_tunnus, order_raw)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.key,
      row.session_key,
      row.section_key,
      row.ordinal,
      row.ordinal_number,
      row.speech_type,
      row.request_method,
      row.request_time,
      row.person_id,
      row.first_name,
      row.last_name,
      row.gender,
      row.party_abbreviation,
      row.has_spoken,
      row.ministry,
      row.modified_datetime,
      row.created_datetime,
      row.imported_datetime,
      row.ad_tunnus,
      row.order_raw,
    ],
  );
  return row;
}

/**
 * Seed a parliamentary group membership.
 */
export function seedGroupMembership(
  db: Database,
  overrides: Partial<{
    id: number;
    person_id: number;
    group_code: string;
    group_name: string;
    start_date: string;
    end_date: string | null;
  }> = {},
) {
  const defaults = {
    id: 1,
    person_id: 1000,
    group_code: "kesk",
    group_name: "Keskustan eduskuntaryhmä",
    start_date: "2023-04-01",
    end_date: null as string | null,
  };
  const row = { ...defaults, ...overrides };

  db.run(`INSERT OR IGNORE INTO ParliamentaryGroup (code) VALUES (?)`, [
    row.group_code,
  ]);
  db.run(
    `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.person_id,
      row.group_code,
      row.group_name,
      row.start_date,
      row.end_date,
    ],
  );
  return row;
}

/**
 * Seed a term.
 */
export function seedTerm(
  db: Database,
  overrides: Partial<{
    id: number;
    person_id: number;
    start_date: string;
    end_date: string | null;
    start_year: number;
    end_year: number | null;
  }> = {},
) {
  const defaults = {
    id: 1,
    person_id: 1000,
    start_date: "2023-04-01",
    end_date: null as string | null,
    start_year: 2023,
    end_year: null as number | null,
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.person_id,
      row.start_date,
      row.end_date,
      row.start_year,
      row.end_year,
    ],
  );
  return row;
}

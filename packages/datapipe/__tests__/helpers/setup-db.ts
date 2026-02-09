import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(import.meta.dirname, "../../migrator/migrations");

const MIGRATION_FILES = [
  "V001.001__representatives_schema.sql",
  "V001.002__session_agenda_schema.sql",
  "V001.003__sections_and_votings_schema.sql",
  "V001.004__vote_schema.sql",
  "V001.005__speech_schema.sql",
  "V001.006__excel_speech_schema.sql",
  "V001.007__government_coalition_schema.sql",
  "V001.008__performance_indexes.sql",
  "V001.009__add_term_year_columns.sql",
  "V001.010__vaski_document_schema.sql",
  "V001.011__analytics_indexes.sql",
];

/**
 * Strip SQL inline comments (-- ...) from a line, preserving string literals.
 */
function stripInlineComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      // Remove inline comments (-- ...) but not inside string literals
      const commentIdx = line.indexOf("--");
      if (commentIdx === -1) return line;
      // Simple heuristic: if -- appears, strip from there
      // This works for our migration files which don't have -- inside strings
      return line.substring(0, commentIdx);
    })
    .join("\n");
}

/**
 * Apply migration SQL files up to and including the given version number.
 * e.g. upToVersion = 4 applies V001.001 through V001.004
 */
export function applyMigrations(db: Database, upToVersion = 11) {
  for (const file of MIGRATION_FILES) {
    const versionMatch = file.match(/V001\.(\d+)/);
    if (!versionMatch) continue;
    const version = parseInt(versionMatch[1], 10);
    if (version > upToVersion) break;

    const raw = readFileSync(join(MIGRATIONS_DIR, file), "utf-8");
    const sql = stripInlineComments(raw);
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    for (const stmt of statements) {
      db.exec(stmt);
    }
  }
}

/**
 * Create an in-memory SQLite database with schema applied.
 */
export function createTestDb(
  upToVersion = 11,
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
    session_key: string;
    ordinal: number;
  }> = {},
) {
  const defaults = {
    id: 10,
    key: "2024/1/3",
    title: "Hallituksen esitys eduskunnalle",
    session_key: "2024/1",
    ordinal: 3,
    processing_title: "Ainoa käsittely",
  };
  const row = { ...defaults, ...overrides };

  db.run(
    `INSERT INTO Section (id, key, title, session_key, ordinal, processing_title)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      row.id,
      row.key,
      row.title,
      row.session_key,
      row.ordinal,
      row.processing_title,
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

  db.run(
    `INSERT OR IGNORE INTO ParliamentaryGroup (code) VALUES (?)`,
    [row.group_code],
  );
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

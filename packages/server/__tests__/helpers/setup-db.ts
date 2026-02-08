import { Database } from "bun:sqlite";
import { readFileSync } from "fs";
import { join } from "path";

const MIGRATIONS_DIR = join(
  import.meta.dirname,
  "../../../datapipe/migrator/migrations",
);

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
];

/**
 * Strip SQL inline comments (-- ...) from each line.
 */
function stripInlineComments(sql: string): string {
  return sql
    .split("\n")
    .map((line) => {
      const commentIdx = line.indexOf("--");
      if (commentIdx === -1) return line;
      return line.substring(0, commentIdx);
    })
    .join("\n");
}

export function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");

  for (const file of MIGRATION_FILES) {
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

  return db;
}

/**
 * Seed a fully-connected test dataset for query testing.
 */
export function seedFullDataset(db: Database) {
  // Representatives
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1000, "Meikäläinen", "Matti", "Meikäläinen Matti", "kesk", "mies", "1970-01-15", 0],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1001, "Virtanen", "Maija", "Virtanen Maija", "sd", "nainen", "1985-06-20", 0],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1002, "Korhonen", "Pekka", "Korhonen Pekka", "kok", "mies", "1960-03-10", 1],
  );

  // Terms
  db.run(
    `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1, 1000, "2023-04-01", null, 2023, null],
  );
  db.run(
    `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [2, 1001, "2023-04-01", null, 2023, null],
  );
  db.run(
    `INSERT INTO Term (id, person_id, start_date, end_date, start_year, end_year)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [3, 1002, "2023-04-01", null, 2023, null],
  );

  // Parliamentary groups
  db.run(`INSERT INTO ParliamentaryGroup (code) VALUES (?)`, ["kesk"]);
  db.run(`INSERT INTO ParliamentaryGroup (code) VALUES (?)`, ["sd"]);
  db.run(`INSERT INTO ParliamentaryGroup (code) VALUES (?)`, ["kok"]);

  // Group memberships
  db.run(
    `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1, 1000, "kesk", "Keskustan eduskuntaryhmä", "2023-04-01", null],
  );
  db.run(
    `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [2, 1001, "sd", "Sosialidemokraattinen eduskuntaryhmä", "2023-04-01", null],
  );
  db.run(
    `INSERT INTO ParliamentaryGroupMembership (id, person_id, group_code, group_name, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [3, 1002, "kok", "Kokoomuksen eduskuntaryhmä", "2023-04-01", null],
  );

  // Agenda + Sessions
  db.run(`INSERT INTO Agenda (key, title, state) VALUES (?, ?, ?)`, [
    "PJ_2024_1",
    "Täysistunnon päiväjärjestys 1/2024",
    "Valmis",
  ]);
  db.run(`INSERT INTO Agenda (key, title, state) VALUES (?, ?, ?)`, [
    "PJ_2024_2",
    "Täysistunnon päiväjärjestys 2/2024",
    "Valmis",
  ]);

  db.run(
    `INSERT INTO Session (id, number, key, date, year, type, state, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, 1, "2024/1", "2024-01-15", 2024, "varsinainen", "Päättynyt", "PJ_2024_1"],
  );
  db.run(
    `INSERT INTO Session (id, number, key, date, year, type, state, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [2, 2, "2024/2", "2024-01-16", 2024, "varsinainen", "Päättynyt", "PJ_2024_2"],
  );

  // Sections
  db.run(
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [10, "2024/1/3", "3", "Hallituksen esitys", 3, "Ainoa käsittely", "2024/1", "PJ_2024_1"],
  );
  db.run(
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [11, "2024/1/4", "4", "Välikysymys", 4, "Palautekeskustelu", "2024/1", "PJ_2024_1"],
  );

  // Votings
  db.run(
    `INSERT INTO Voting (id, number, start_time, annulled, title, n_yes, n_no, n_abstain, n_absent, n_total, section_title, session_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [100, 1, "2024-01-15T10:00:00", 0, "Äänestys 1", 100, 50, 5, 45, 200, "Hallituksen esitys", "2024/1"],
  );
  db.run(
    `INSERT INTO Voting (id, number, start_time, annulled, title, n_yes, n_no, n_abstain, n_absent, n_total, section_title, session_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [101, 2, "2024-01-15T11:00:00", 0, "Äänestys 2", 120, 30, 10, 40, 200, "Välikysymys", "2024/1"],
  );

  // Votes
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5000, 100, 1000, "Jaa", "kesk"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5001, 100, 1001, "Ei", "sd"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5002, 100, 1002, "Poissa", "kok"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5003, 101, 1000, "Jaa", "kesk"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5004, 101, 1001, "Jaa", "sd"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbrviation) VALUES (?, ?, ?, ?, ?)`,
    [5005, 101, 1002, "Poissa", "kok"],
  );
}

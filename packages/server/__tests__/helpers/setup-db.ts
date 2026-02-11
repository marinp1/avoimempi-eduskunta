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
  "V001.011__analytics_indexes.sql",
  "V001.012__salidb_extensions.sql",
  "V001.013__salidb_link_indexes.sql",
  "V001.014__vaski_schema.sql",
  "V001.015__vaski_indexes.sql",
  "V001.016__vaski_base_ext.sql",
  "V001.017__vaski_minutes_link.sql",
  "V001.018__vaski_document_summary.sql",
  "V001.019__query_performance_indexes.sql",
  "V001.020__vaski_minutes_section_linking.sql",
  "V001.021__vaski_relational_links.sql",
  "V001.022__document_v2_schema.sql",
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
    [1000, "Meikäläinen", "Matti", "Meikäläinen Matti", "kesk", "Mies", "1970-01-15", 0],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1001, "Virtanen", "Maija", "Virtanen Maija", "sd", "Nainen", "1985-06-20", 0],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [1002, "Korhonen", "Pekka", "Korhonen Pekka", "kok", "Mies", "1960-03-10", 1],
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
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key, vaski_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [10, "2024/1/3", "3", "Hallituksen esitys", 3, "Ainoa käsittely", "2024/1", "PJ_2024_1", 1],
  );
  db.run(
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key, vaski_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [11, "2024/1/4", "4", "Välikysymys", 4, "Palautekeskustelu", "2024/1", "PJ_2024_1", 2],
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
    [101, 2, "2024-01-15T11:00:00", 0, "Äänestys 2", 102, 98, 0, 0, 200, "Välikysymys", "2024/1"],
  );

  // Speeches (linked to sections)
  db.run(
    `INSERT INTO Speech (id, key, session_key, section_key, ordinal, ordinal_number, speech_type, person_id,
      first_name, last_name, gender, party_abbreviation, has_spoken, excel_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [200, "speech_200", "2024/1", "2024/1/3", 20240115100000, 1, "Puheenvuoro", 1000,
      "Matti", "Meikäläinen", "Mies", "kesk", 1, "20240115_1000"],
  );
  db.run(
    `INSERT INTO Speech (id, key, session_key, section_key, ordinal, ordinal_number, speech_type, person_id,
      first_name, last_name, gender, party_abbreviation, has_spoken, excel_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [201, "speech_201", "2024/1", "2024/1/3", 20240115100100, 2, "Puheenvuoro", 1001,
      "Maija", "Virtanen", "Nainen", "sd", 1, "20240115_1001"],
  );

  // Government memberships (Pekka is a minister in current government)
  db.run(
    `INSERT INTO GovernmentMembership (id, person_id, ministry, name, government, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [1, 1002, "Valtiovarainministeriö", "Valtiovarainministeri", "Orpon hallitus", "2023-06-20", null],
  );

  // Committees
  db.run(`INSERT INTO Committee (code, name) VALUES (?, ?)`, ["VaV", "Valtiovarainvaliokunta"]);
  db.run(`INSERT INTO Committee (code, name) VALUES (?, ?)`, ["SuV", "Suuri valiokunta"]);

  // Committee memberships
  db.run(
    `INSERT INTO CommitteeMembership (id, person_id, committee_code, role, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [1, 1000, "VaV", "jäsen", "2023-04-01", null],
  );
  db.run(
    `INSERT INTO CommitteeMembership (id, person_id, committee_code, role, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [2, 1002, "VaV", "puheenjohtaja", "2023-04-01", null],
  );

  // Trust positions
  db.run(
    `INSERT INTO TrustPosition (id, person_id, position_type, name, period)
     VALUES (?, ?, ?, ?, ?)`,
    [1, 1000, "national", "Kunnanvaltuuston jäsen", "2017-2021"],
  );

  // Districts
  db.run(`INSERT INTO District (code, name) VALUES (?, ?)`, ["HEL", "Helsingin vaalipiiri"]);
  db.run(
    `INSERT INTO RepresentativeDistrict (id, person_id, district_code, start_date, end_date)
     VALUES (?, ?, ?, ?, ?)`,
    [1, 1000, "HEL", "2023-04-01", null],
  );

  // Documents
  db.run(
    `INSERT INTO Document (id, type_slug, type_name_fi, root_family, eduskunta_tunnus, document_type_code,
      document_number_text, parliamentary_year_text, title, status_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [1, "hallituksen_esitys", "Hallituksen esitys", "HallituksenEsitys", "HE 1/2024", "HE", "1", "2024",
      "Hallituksen esitys laiksi", "Valmis", "2024-01-10"],
  );
  db.run(
    `INSERT INTO Document (id, type_slug, type_name_fi, root_family, eduskunta_tunnus, document_type_code,
      document_number_text, parliamentary_year_text, title, status_text, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [2, "kirjallinen_kysymys", "Kirjallinen kysymys", "Kysymys", "KK 100/2024", "KK", "100", "2024",
      "Kysymys verotuksesta", "Valmis", "2024-01-12"],
  );

  // Document actors
  db.run(
    `INSERT INTO DocumentActor (document_id, role_code, first_name, last_name, position_text)
     VALUES (?, ?, ?, ?, ?)`,
    [1, "laatija", "Pekka", "Korhonen", "valtiovarainministeri"],
  );
  db.run(
    `INSERT INTO DocumentActor (document_id, role_code, first_name, last_name, position_text)
     VALUES (?, ?, ?, ?, ?)`,
    [2, "laatija", "Matti", "Meikäläinen", "kansanedustaja"],
  );

  // Document subjects
  db.run(
    `INSERT INTO DocumentSubject (document_id, subject_text) VALUES (?, ?)`,
    [1, "verotus"],
  );
  db.run(
    `INSERT INTO DocumentSubject (document_id, subject_text) VALUES (?, ?)`,
    [1, "talous"],
  );

  // Document relations
  db.run(
    `INSERT INTO DocumentRelation (document_id, relation_type, target_tunnus)
     VALUES (?, ?, ?)`,
    [1, "vireilletulo", "HE 1/2024 vp"],
  );

  // SessionSectionSpeech (content for speeches)
  db.run(
    `INSERT INTO SessionSectionSpeech (session_key, section_key, source_document_id, section_ordinal, speech_ordinal,
      person_id, first_name, last_name, party, speech_type, start_time, end_time, content, link_key, source_item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["2024/1", "2024/1/3", 1, 1, 1, 1000, "Matti", "Meikäläinen", "kesk",
      "(vastauspuheenvuoro)", "2024-01-15T10:00:00", "2024-01-15T10:05:00",
      "Arvoisa puhemies tämä on testipuheenvuoro kansanedustajalta", "20240115_1000", null],
  );
  db.run(
    `INSERT INTO SessionSectionSpeech (session_key, section_key, source_document_id, section_ordinal, speech_ordinal,
      person_id, first_name, last_name, party, speech_type, start_time, end_time, content, link_key, source_item_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ["2024/1", "2024/1/3", 1, 1, 2, 1001, "Maija", "Virtanen", "sd",
      "(esittelypuheenvuoro)", "2024-01-15T10:05:00", "2024-01-15T10:10:00",
      "Arvoisa puhemies esittelen tämän asian eduskunnalle", "20240115_1001", null],
  );

  // Link sections and session to their source documents via direct FKs
  db.run(`UPDATE Section SET document_id = ? WHERE key = ?`, [1, "2024/1/3"]);
  db.run(`UPDATE Section SET document_id = ? WHERE key = ?`, [2, "2024/1/4"]);
  db.run(`UPDATE Session SET minutes_document_id = ? WHERE key = ?`, [1, "2024/1"]);

  // Leaving parliament records
  db.run(
    `INSERT INTO PeopleLeavingParliament (person_id, description, end_date)
     VALUES (?, ?, ?)`,
    [1000, "Eroilmoitus", null],
  );

  // Votes
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5000, 100, 1000, "Jaa", "kesk"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5001, 100, 1001, "Ei", "sd"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5002, 100, 1002, "Poissa", "kok"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5003, 101, 1000, "Jaa", "kesk"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5004, 101, 1001, "Jaa", "sd"],
  );
  db.run(
    `INSERT INTO Vote (id, voting_id, person_id, vote, group_abbreviation) VALUES (?, ?, ?, ?, ?)`,
    [5005, 101, 1002, "Poissa", "kok"],
  );
}

import { Database } from "bun:sqlite";
import { join } from "node:path";
import { getMigrations, migrate } from "bun-sqlite-migrations";

const MIGRATIONS_DIR = join(
  import.meta.dirname,
  "../../../datapipe/migrator/migrations",
);

function tableExists(db: Database, tableName: string): boolean {
  const row = db
    .query<{ exists_flag: number }, { $tableName: string }>(
      "SELECT 1 as exists_flag FROM sqlite_master WHERE type='table' AND name = $tableName LIMIT 1",
    )
    .get({ $tableName: tableName });
  return !!row?.exists_flag;
}

export function createTestDb(): Database {
  const db = new Database(":memory:");
  db.exec("PRAGMA journal_mode = WAL;");
  db.exec("PRAGMA foreign_keys = ON;");
  migrate(db, getMigrations(MIGRATIONS_DIR));
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
    [
      1000,
      "Meikäläinen",
      "Matti",
      "Meikäläinen Matti",
      "kesk",
      "Mies",
      "1970-01-15",
      0,
    ],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1001,
      "Virtanen",
      "Maija",
      "Virtanen Maija",
      "sd",
      "Nainen",
      "1985-06-20",
      0,
    ],
  );
  db.run(
    `INSERT INTO Representative (person_id, last_name, first_name, sort_name, party, gender, birth_date, minister)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1002,
      "Korhonen",
      "Pekka",
      "Korhonen Pekka",
      "kok",
      "Mies",
      "1960-03-10",
      1,
    ],
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
    [
      1,
      1,
      "2024/1",
      "2024-01-15",
      2024,
      "varsinainen",
      "Päättynyt",
      "PJ_2024_1",
    ],
  );
  db.run(
    `INSERT INTO Session (id, number, key, date, year, type, state, agenda_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      2,
      2,
      "2024/2",
      "2024-01-16",
      2024,
      "varsinainen",
      "Päättynyt",
      "PJ_2024_2",
    ],
  );

  // Sections
  db.run(
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key, vaski_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      10,
      "2024/1/3",
      "3",
      "Hallituksen esitys",
      3,
      "Ainoa käsittely",
      "2024/1",
      "PJ_2024_1",
      1,
    ],
  );
  db.run(
    `INSERT INTO Section (id, key, identifier, title, ordinal, processing_title, session_key, agenda_key, vaski_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      11,
      "2024/1/4",
      "4",
      "Välikysymys",
      4,
      "Palautekeskustelu",
      "2024/1",
      "PJ_2024_1",
      2,
    ],
  );

  // Votings
  db.run(
    `INSERT INTO Voting (id, number, start_time, annulled, title, n_yes, n_no, n_abstain, n_absent, n_total, section_title, session_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      100,
      1,
      "2024-01-15T10:00:00",
      0,
      "Äänestys 1",
      100,
      50,
      5,
      45,
      200,
      "Hallituksen esitys",
      "2024/1",
    ],
  );
  db.run(
    `INSERT INTO Voting (id, number, start_time, annulled, title, n_yes, n_no, n_abstain, n_absent, n_total, section_title, session_key)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      101,
      2,
      "2024-01-15T11:00:00",
      0,
      "Äänestys 2",
      102,
      98,
      0,
      0,
      200,
      "Välikysymys",
      "2024/1",
    ],
  );

  // Speeches (linked to sections)
  db.run(
    `INSERT INTO Speech (id, key, session_key, section_key, ordinal, ordinal_number, speech_type, person_id,
      first_name, last_name, gender, party_abbreviation, has_spoken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      200,
      "speech_200",
      "2024/1",
      "2024/1/3",
      20240115100000,
      1,
      "Puheenvuoro",
      1000,
      "Matti",
      "Meikäläinen",
      "Mies",
      "kesk",
      1,
    ],
  );
  db.run(
    `INSERT INTO Speech (id, key, session_key, section_key, ordinal, ordinal_number, speech_type, person_id,
      first_name, last_name, gender, party_abbreviation, has_spoken)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      201,
      "speech_201",
      "2024/1",
      "2024/1/3",
      20240115100100,
      2,
      "Puheenvuoro",
      1001,
      "Maija",
      "Virtanen",
      "Nainen",
      "sd",
      1,
    ],
  );

  // Government memberships (Pekka is a minister in current government)
  db.run(
    `INSERT INTO Government (id, name, start_date, end_date)
     VALUES (?, ?, ?, ?)`,
    [1, "Orpon hallitus", "2023-06-20", null],
  );
  db.run(
    `INSERT INTO GovernmentMembership (id, person_id, ministry, name, government, government_id, start_date, end_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      1,
      1002,
      "Valtiovarainministeriö",
      "Valtiovarainministeri",
      "Orpon hallitus",
      1,
      "2023-06-20",
      null,
    ],
  );

  // Committees
  db.run(`INSERT INTO Committee (code, name) VALUES (?, ?)`, [
    "VaV",
    "Valtiovarainvaliokunta",
  ]);
  db.run(`INSERT INTO Committee (code, name) VALUES (?, ?)`, [
    "SuV",
    "Suuri valiokunta",
  ]);

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
  db.run(`INSERT INTO District (code, name) VALUES (?, ?)`, [
    "HEL",
    "Helsingin vaalipiiri",
  ]);
  db.run(
    `INSERT INTO RepresentativeDistrict (id, person_id, district_code, start_date, end_date)
     VALUES (?, ?, ?, ?, ?)`,
    [1, 1000, "HEL", "2023-04-01", null],
  );

  if (
    tableExists(db, "Document") &&
    tableExists(db, "DocumentActor") &&
    tableExists(db, "DocumentSubject") &&
    tableExists(db, "DocumentRelation") &&
    tableExists(db, "SessionSectionSpeech")
  ) {
    // Documents
    db.run(
      `INSERT INTO Document (id, type_slug, type_name_fi, root_family, eduskunta_tunnus, document_type_code,
        document_number_text, parliamentary_year_text, title, status_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        1,
        "hallituksen_esitys",
        "Hallituksen esitys",
        "HallituksenEsitys",
        "HE 1/2024",
        "HE",
        "1",
        "2024",
        "Hallituksen esitys laiksi",
        "Valmis",
        "2024-01-10",
      ],
    );
    db.run(
      `INSERT INTO Document (id, type_slug, type_name_fi, root_family, eduskunta_tunnus, document_type_code,
        document_number_text, parliamentary_year_text, title, status_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        2,
        "kirjallinen_kysymys",
        "Kirjallinen kysymys",
        "Kysymys",
        "KK 100/2024",
        "KK",
        "100",
        "2024",
        "Kysymys verotuksesta",
        "Valmis",
        "2024-01-12",
      ],
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
      [
        "2024/1",
        "2024/1/3",
        1,
        1,
        1,
        1000,
        "Matti",
        "Meikäläinen",
        "kesk",
        "(vastauspuheenvuoro)",
        "2024-01-15T10:00:00",
        "2024-01-15T10:05:00",
        "Arvoisa puhemies tämä on testipuheenvuoro kansanedustajalta",
        "20240115_1000",
        null,
      ],
    );
    db.run(
      `INSERT INTO SessionSectionSpeech (session_key, section_key, source_document_id, section_ordinal, speech_ordinal,
        person_id, first_name, last_name, party, speech_type, start_time, end_time, content, link_key, source_item_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        "2024/1",
        "2024/1/3",
        1,
        1,
        2,
        1001,
        "Maija",
        "Virtanen",
        "sd",
        "(esittelypuheenvuoro)",
        "2024-01-15T10:05:00",
        "2024-01-15T10:10:00",
        "Arvoisa puhemies esittelen tämän asian eduskunnalle",
        "20240115_1001",
        null,
      ],
    );

    // Link sections and session to their source documents via direct FKs
    db.run(`UPDATE Section SET document_id = ? WHERE key = ?`, [1, "2024/1/3"]);
    db.run(`UPDATE Section SET document_id = ? WHERE key = ?`, [2, "2024/1/4"]);
    db.run(`UPDATE Session SET minutes_document_id = ? WHERE key = ?`, [
      1,
      "2024/1",
    ]);
  }

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

  if (tableExists(db, "VotingPartyStats")) {
    db.run(`DELETE FROM VotingPartyStats`);
    db.run(
      `INSERT INTO VotingPartyStats (
         voting_id,
         party,
         votes_cast,
         total_votings,
         party_member_count,
         n_jaa,
         n_ei,
         n_tyhjaa,
         n_poissa
       )
       SELECT
         v.voting_id,
         v.group_abbreviation AS party,
         SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
         COUNT(*) AS total_votings,
         COUNT(DISTINCT v.person_id) AS party_member_count,
         SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) AS n_jaa,
         SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) AS n_ei,
         SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END) AS n_tyhjaa,
         SUM(CASE WHEN v.vote = 'Poissa' THEN 1 ELSE 0 END) AS n_poissa
       FROM Vote v
       WHERE v.group_abbreviation IS NOT NULL
         AND TRIM(v.group_abbreviation) != ''
       GROUP BY v.voting_id, v.group_abbreviation`,
    );
  }

  if (tableExists(db, "PersonVotingDailyStats")) {
    db.run(`DELETE FROM PersonVotingDailyStats`);
    db.run(
      `INSERT INTO PersonVotingDailyStats (
         person_id,
         voting_date,
         votes_cast,
         total_votings
       )
       SELECT
         v.person_id,
         vt.start_date AS voting_date,
         SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
         COUNT(*) AS total_votings
       FROM Vote v
       JOIN Voting vt ON vt.id = v.voting_id
       WHERE v.person_id IS NOT NULL
         AND vt.start_date IS NOT NULL
       GROUP BY v.person_id, vt.start_date`,
    );
  }

  if (tableExists(db, "PersonSpeechDailyStats")) {
    db.run(`DELETE FROM PersonSpeechDailyStats`);
    if (tableExists(db, "SpeechContent")) {
      db.run(
        `INSERT INTO PersonSpeechDailyStats (
           person_id,
           speech_date,
           speech_count,
           total_words,
           first_speech,
           last_speech
         )
         SELECT
           sp.person_id,
           SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10) AS speech_date,
           COUNT(*) AS speech_count,
           SUM(
             CASE
               WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
               ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
             END
           ) AS total_words,
           MIN(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS first_speech,
           MAX(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS last_speech
         FROM Speech sp
         LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
         LEFT JOIN Session sess ON sess.key = sp.session_key
         WHERE COALESCE(sp.has_spoken, 1) = 1
           AND sp.person_id IS NOT NULL
           AND COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date) IS NOT NULL
         GROUP BY sp.person_id, SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10)`,
      );
    } else {
      db.run(
        `INSERT INTO PersonSpeechDailyStats (
           person_id,
           speech_date,
           speech_count,
           total_words,
           first_speech,
           last_speech
         )
         SELECT
           sp.person_id,
           SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10) AS speech_date,
           COUNT(*) AS speech_count,
           0 AS total_words,
           MIN(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS first_speech,
           MAX(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date)) AS last_speech
         FROM Speech sp
         LEFT JOIN Session sess ON sess.key = sp.session_key
         WHERE COALESCE(sp.has_spoken, 1) = 1
           AND sp.person_id IS NOT NULL
           AND COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date) IS NOT NULL
         GROUP BY sp.person_id, SUBSTR(COALESCE(sp.request_time, sp.modified_datetime, sp.created_datetime, sess.date), 1, 10)`,
      );
    }
  }

  if (tableExists(db, "FederatedSearchFts")) {
    db.run(`DELETE FROM FederatedSearchFts`);

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "mp",
        "1000",
        "Matti Meikäläinen",
        "kesk",
        "Matti Meikäläinen kesk",
        null,
      ],
    );

    db.run(
      `INSERT INTO FederatedSearchFts (type, record_id, title, subtitle, body, date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        "voting",
        "100",
        "Hallituksen esitys",
        "Jaa: 100 / Ei: 50",
        "Hallituksen esitys Äänestys 1 2024/1",
        "2024-01-15T10:00:00",
      ],
    );
  }
}

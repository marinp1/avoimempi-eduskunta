CREATE TABLE Representative (
    person_id INTEGER PRIMARY KEY,
    last_name VARCHAR(100),
    first_name VARCHAR(100),
    sort_name VARCHAR(100),
    marticle_name VARCHAR(100),
    party VARCHAR(100),
    minister INTEGER,
    phone VARCHAR(50) NULL,
    email VARCHAR(100) NULL,
    current_municipality VARCHAR(100) NULL,
    profession VARCHAR(100),
    website TEXT,
    additional_info TEXT,
    birth_date DATE,
    birth_year INTEGER GENERATED ALWAYS AS (CASE WHEN birth_date IS NULL THEN NULL ELSE CAST(SUBSTR(birth_date, 1, 4) AS INTEGER) END) VIRTUAL,
    birth_place VARCHAR(100),
    death_date DATE,
    death_place VARCHAR(100),
    gender VARCHAR(16),
    term_end_date DATE
);

CREATE TABLE Education (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    name VARCHAR(255),
    institution VARCHAR(255),
    year INTEGER,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE WorkHistory (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    position VARCHAR(255),
    period VARCHAR(50),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Committee (
    code VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255)
);

CREATE TABLE CommitteeMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    committee_code VARCHAR(50),
    role VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (committee_code) REFERENCES Committee(code)
);

CREATE TABLE TrustPosition (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    position_type VARCHAR(50),
    name VARCHAR(255),
    period VARCHAR(50),
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE GovernmentMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    name VARCHAR(255),
    ministry VARCHAR(255),
    government VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Publications (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    title VARCHAR(255),
    year INTEGER,
    authors TEXT,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE ParliamentaryGroup (
    code VARCHAR(50) PRIMARY KEY
);

CREATE TABLE ParliamentaryGroupMembership (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    group_code VARCHAR(50),
    group_abbreviation TEXT GENERATED ALWAYS AS (LOWER(RTRIM(group_code, '0123456789'))) VIRTUAL,
    group_name VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (group_code) REFERENCES ParliamentaryGroup(code)
);

CREATE TABLE ParliamentaryGroupAssignment (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    group_code VARCHAR(50),
    group_name VARCHAR(255),
    role VARCHAR(255),
    time_period VARCHAR(255),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (group_code) REFERENCES ParliamentaryGroup(code)
);

CREATE TABLE District (
    id INTEGER PRIMARY KEY,
    code VARCHAR(50) UNIQUE,
    name VARCHAR(255)
);

CREATE TABLE RepresentativeDistrict (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    district_code VARCHAR(50),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id),
    FOREIGN KEY (district_code) REFERENCES District(code)
);

CREATE TABLE Term (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    start_date DATE,
    end_date DATE,
    start_year INTEGER,
    end_year INTEGER,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE PeopleLeavingParliament (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE PeopleJoiningParliament (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE TemporaryAbsence (
    id INTEGER PRIMARY KEY,
    person_id INTEGER,
    description TEXT,
    replacement_person VARCHAR(50),
    start_date DATE,
    end_date DATE,
    FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Agenda (
  key TEXT PRIMARY KEY,
  title TEXT,
  state TEXT
);

CREATE TABLE Session (
  id INTEGER PRIMARY KEY,
  number INTEGER,
  key TEXT UNIQUE,
  date TEXT,
  year INTEGER,
  type TEXT,
  state TEXT,
  description TEXT,
  start_time_actual TEXT,
  start_time_reported TEXT,
  article_key TEXT,
  speaker_id INTEGER,
  agenda_key TEXT,
  modified_datetime TEXT,
  created_datetime TEXT,
  imported_datetime TEXT,
  end_time TEXT,
  roll_call_time TEXT,
  state_text_fi TEXT,
  manual_blocked INTEGER,
  attachment_group_id INTEGER,
  roll_call_document_id INTEGER,
  agenda_document_id INTEGER,
  minutes_document_id INTEGER,
  FOREIGN KEY (agenda_key) REFERENCES Agenda(key),
  FOREIGN KEY (speaker_id) REFERENCES Representative(person_id)
);

CREATE TABLE Section (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  identifier TEXT,
  title TEXT,
  ordinal INTEGER,
  note TEXT,
  processing_title TEXT,
  resolution TEXT,
  session_key TEXT,
  agenda_key TEXT,
  modified_datetime TEXT,
  vaski_id INTEGER,
  default_speech_type TEXT,
  can_request_speech INTEGER,
  created_datetime TEXT,
  imported_datetime TEXT,
  source_section_id INTEGER,
  source_parent_section_id INTEGER,
  document_id INTEGER,
  document_tunnus TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (agenda_key) REFERENCES Agenda(key)
);

CREATE TABLE Voting (
  id INTEGER PRIMARY KEY,
  number INTEGER,
  start_time TEXT,
  annulled INTEGER,
  title TEXT,
  proceedings_name TEXT,
  proceedings_url TEXT,
  result_url TEXT,
  n_yes INTEGER,
  n_no INTEGER,
  n_abstain INTEGER,
  n_absent INTEGER,
  n_total INTEGER,
  section_processing_phase TEXT,
  section_title TEXT,
  title_extra TEXT,
  end_time TEXT,
  parliamentary_item TEXT,
  parliamentary_item_url TEXT,
  language_id TEXT,
  section_note TEXT,
  section_order INTEGER,
  section_processing_title TEXT,
  main_section_note TEXT,
  main_section_title TEXT,
  sub_section_identifier TEXT,
  agenda_title TEXT,
  imported_datetime TEXT,
  start_date TEXT GENERATED ALWAYS AS (SUBSTR(start_time, 1, 10)) VIRTUAL,
  session_key TEXT,
  modified_datetime TEXT,
  section_id INTEGER,
  section_key TEXT,
  main_section_id TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key)
);

CREATE TABLE Vote (
  id INTEGER PRIMARY KEY,
  voting_id INTEGER,
  person_id INTEGER,
  vote TEXT,
  group_abbreviation TEXT,
  FOREIGN KEY (voting_id) REFERENCES Voting(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE Speech (
  id INTEGER PRIMARY KEY,
  key TEXT UNIQUE,
  session_key TEXT,
  section_key TEXT,
  ordinal INTEGER,
  ordinal_number INTEGER,
  speech_type TEXT,
  request_method TEXT,
  request_time TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  gender TEXT,
  party_abbreviation TEXT,
  has_spoken INTEGER,
  ministry TEXT,
  modified_datetime TEXT,
  created_datetime TEXT,
  imported_datetime TEXT,
  ad_tunnus TEXT,
  order_raw TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE VIEW InferredGovernmentCoalition AS
SELECT DISTINCT
    gm.government,
    MIN(gm.start_date) as start_date,
    MAX(CASE WHEN gm.end_date IS NULL THEN DATE('9999-12-31') ELSE gm.end_date END) as end_date,
    r.party
FROM GovernmentMembership gm
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
GROUP BY gm.government, r.party
ORDER BY start_date DESC, r.party;

CREATE VIEW CurrentGovernmentCoalition AS
SELECT DISTINCT
    gm.government,
    MIN(gm.start_date) as start_date,
    r.party
FROM GovernmentMembership gm
JOIN Representative r ON gm.person_id = r.person_id
WHERE r.party IS NOT NULL
  AND (gm.end_date IS NULL OR gm.end_date >= DATE('now'))
GROUP BY gm.government, r.party
ORDER BY r.party;


CREATE TABLE SectionDocumentLink (
  id INTEGER PRIMARY KEY,
  section_key TEXT NOT NULL,
  key TEXT,
  name_fi TEXT,
  link_text_fi TEXT,
  link_url_fi TEXT,
  created_datetime TEXT,
  modified_datetime TEXT,
  imported_datetime TEXT
);

CREATE TABLE SessionNotice (
  id INTEGER PRIMARY KEY,
  key TEXT,
  session_key TEXT NOT NULL,
  section_key TEXT,
  notice_type TEXT,
  text_fi TEXT,
  valid_until TEXT,
  sent_at TEXT,
  created_datetime TEXT,
  modified_datetime TEXT,
  imported_datetime TEXT
);


CREATE TABLE SaliDBDocumentReference (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_type TEXT NOT NULL,
  voting_id INTEGER,
  section_key TEXT,
  document_tunnus TEXT NOT NULL,
  source_text TEXT,
  source_url TEXT,
  created_datetime TEXT,
  imported_datetime TEXT,
  FOREIGN KEY (voting_id) REFERENCES Voting(id)
);

CREATE INDEX idx_voting_start_time ON Voting(start_time);

CREATE INDEX idx_vote_person_voting ON Vote(person_id, voting_id);

CREATE INDEX idx_vote_voting_id ON Vote(voting_id);

CREATE INDEX idx_pgm_person_dates ON ParliamentaryGroupMembership(person_id, start_date, end_date);

CREATE INDEX idx_pgm_group_name ON ParliamentaryGroupMembership(group_name);

CREATE INDEX idx_gm_government ON GovernmentMembership(government);

CREATE INDEX idx_gm_person_government ON GovernmentMembership(person_id, government);

CREATE INDEX idx_gm_dates ON GovernmentMembership(start_date, end_date);

CREATE INDEX idx_term_person_dates ON Term(person_id, start_date, end_date);

CREATE INDEX idx_representative_gender ON Representative(gender);

CREATE INDEX idx_representative_birth_date ON Representative(birth_date);

CREATE INDEX idx_term_start_year ON Term(start_year);

CREATE INDEX idx_term_end_year ON Term(end_year);

CREATE INDEX idx_term_person_years ON Term(person_id, start_year, end_year);

CREATE INDEX idx_vote_group ON Vote(group_abbreviation);

CREATE INDEX idx_vote_vote ON Vote(vote);

CREATE INDEX idx_vote_group_vote ON Vote(group_abbreviation, vote);

CREATE INDEX idx_session_date ON Session(date);

CREATE INDEX idx_session_year ON Session(year);

CREATE INDEX idx_committee_membership_person ON CommitteeMembership(person_id);

CREATE INDEX idx_committee_membership_committee ON CommitteeMembership(committee_code);

CREATE INDEX idx_voting_session_key ON Voting(session_key);

CREATE INDEX idx_section_session_key ON Section(session_key);


CREATE INDEX idx_section_document_link_section ON SectionDocumentLink(section_key);

CREATE INDEX idx_session_notice_session ON SessionNotice(session_key);

CREATE INDEX idx_session_notice_section ON SessionNotice(section_key);


CREATE INDEX idx_salidb_docref_tunnus ON SaliDBDocumentReference(document_tunnus);

CREATE INDEX idx_salidb_docref_voting ON SaliDBDocumentReference(voting_id);

CREATE INDEX idx_salidb_docref_section ON SaliDBDocumentReference(section_key);

CREATE INDEX idx_section_session_ordinal ON Section(session_key, ordinal);

CREATE INDEX idx_voting_section_key ON Voting(section_key);

CREATE INDEX idx_speech_section_key ON Speech(section_key);

CREATE INDEX idx_speech_section_person ON Speech(section_key, person_id);

CREATE INDEX idx_speech_section_party ON Speech(section_key, party_abbreviation);

CREATE INDEX idx_vote_voting_group_vote ON Vote(voting_id, group_abbreviation, vote);

CREATE INDEX idx_vote_vote_voting_group ON Vote(vote, voting_id, group_abbreviation);

CREATE INDEX idx_pgm_end_group_person ON ParliamentaryGroupMembership(end_date, group_code, person_id);

CREATE INDEX idx_term_years_person ON Term(start_year, end_year, person_id);

CREATE INDEX idx_voting_start_date_expr ON Voting(SUBSTR(start_time, 1, 10));

CREATE INDEX idx_representative_birth_year ON Representative(birth_year);

CREATE INDEX idx_voting_start_date ON Voting(start_date);

CREATE INDEX idx_pgm_group_abbreviation ON ParliamentaryGroupMembership(group_abbreviation);

CREATE INDEX idx_section_session_vaski ON Section(session_key, vaski_id);

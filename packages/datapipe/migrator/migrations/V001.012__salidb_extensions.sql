ALTER TABLE Session ADD COLUMN created_datetime TEXT;

ALTER TABLE Session ADD COLUMN imported_datetime TEXT;

ALTER TABLE Session ADD COLUMN end_time TEXT;

ALTER TABLE Session ADD COLUMN roll_call_time TEXT;

ALTER TABLE Session ADD COLUMN state_text_fi TEXT;

ALTER TABLE Session ADD COLUMN manual_blocked INTEGER;

ALTER TABLE Session ADD COLUMN attachment_group_id INTEGER;

ALTER TABLE Session ADD COLUMN xml_data TEXT;

ALTER TABLE Section ADD COLUMN default_speech_type TEXT;

ALTER TABLE Section ADD COLUMN can_request_speech INTEGER;

ALTER TABLE Section ADD COLUMN created_datetime TEXT;

ALTER TABLE Section ADD COLUMN imported_datetime TEXT;

ALTER TABLE Section ADD COLUMN xml_data TEXT;

ALTER TABLE Voting ADD COLUMN title_extra TEXT;

ALTER TABLE Voting ADD COLUMN end_time TEXT;

ALTER TABLE Voting ADD COLUMN parliamentary_item TEXT;

ALTER TABLE Voting ADD COLUMN parliamentary_item_url TEXT;

ALTER TABLE Voting ADD COLUMN language_id TEXT;

ALTER TABLE Voting ADD COLUMN section_note TEXT;

ALTER TABLE Voting ADD COLUMN section_order INTEGER;

ALTER TABLE Voting ADD COLUMN section_processing_title TEXT;

ALTER TABLE Voting ADD COLUMN main_section_note TEXT;

ALTER TABLE Voting ADD COLUMN main_section_title TEXT;

ALTER TABLE Voting ADD COLUMN sub_section_identifier TEXT;

ALTER TABLE Voting ADD COLUMN agenda_title TEXT;

ALTER TABLE Voting ADD COLUMN imported_datetime TEXT;

ALTER TABLE Speech ADD COLUMN created_datetime TEXT;

ALTER TABLE Speech ADD COLUMN imported_datetime TEXT;

ALTER TABLE Speech ADD COLUMN xml_data TEXT;

ALTER TABLE Speech ADD COLUMN ad_tunnus TEXT;

ALTER TABLE Speech ADD COLUMN order_raw TEXT;

CREATE TABLE VotingDocumentLink (
  id INTEGER PRIMARY KEY,
  voting_id INTEGER NOT NULL,
  document_label TEXT,
  document_url TEXT,
  imported_datetime TEXT,
  FOREIGN KEY (voting_id) REFERENCES Voting(id)
);

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

CREATE TABLE VotingDistribution (
  id INTEGER PRIMARY KEY,
  voting_id INTEGER NOT NULL,
  group_name TEXT,
  yes INTEGER,
  no INTEGER,
  abstain INTEGER,
  absent INTEGER,
  total INTEGER,
  distribution_type TEXT,
  imported_datetime TEXT,
  FOREIGN KEY (voting_id) REFERENCES Voting(id)
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

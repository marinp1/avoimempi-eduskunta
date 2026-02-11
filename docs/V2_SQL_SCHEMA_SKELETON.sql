CREATE TABLE Committee (
  id INTEGER PRIMARY KEY,
  slug TEXT UNIQUE,
  name_fi TEXT,
  kind TEXT
);

CREATE TABLE CommitteeSession (
  id INTEGER PRIMARY KEY,
  committee_id INTEGER NOT NULL,
  session_key TEXT UNIQUE,
  label TEXT,
  number_text TEXT,
  parliamentary_year_text TEXT,
  start_time TEXT,
  end_time TEXT,
  source_path TEXT,
  FOREIGN KEY (committee_id) REFERENCES Committee(id)
);

CREATE TABLE Document (
  id INTEGER PRIMARY KEY,
  type_slug TEXT NOT NULL,
  type_name_fi TEXT,
  root_family TEXT,
  eduskunta_tunnus TEXT,
  document_type_code TEXT,
  document_number_text TEXT,
  parliamentary_year_text TEXT,
  title TEXT,
  alternative_title TEXT,
  status_text TEXT,
  language_code TEXT,
  publicity_code TEXT,
  created_at TEXT,
  laadinta_pvm TEXT,
  source_identifiointi_tunnus TEXT,
  source_muu_tunnus TEXT,
  message_type TEXT,
  message_id TEXT,
  message_created_at TEXT,
  transfer_code TEXT,
  organization_slug TEXT,
  organization_name TEXT,
  meeting_slug TEXT,
  source_path TEXT
);

CREATE INDEX idx_document_type_slug ON Document(type_slug);

CREATE INDEX idx_document_tunnus ON Document(eduskunta_tunnus);

CREATE TABLE DocumentActor (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  role_code TEXT,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  position_text TEXT,
  organization_text TEXT,
  extra_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE DocumentSubject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  subject_uri TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocumentAttachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  native_id TEXT,
  use_type TEXT,
  file_name TEXT,
  file_path TEXT,
  format_name TEXT,
  format_version TEXT,
  hash_algorithm TEXT,
  hash_value TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocumentRelation (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  relation_type TEXT NOT NULL,
  target_tunnus TEXT,
  target_system TEXT,
  source_field TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

ALTER TABLE Session ADD COLUMN roll_call_document_id INTEGER;

ALTER TABLE Session ADD COLUMN agenda_document_id INTEGER;

ALTER TABLE Session ADD COLUMN minutes_document_id INTEGER;

CREATE TABLE SessionMinutesItem (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  minutes_document_id INTEGER NOT NULL,
  item_type TEXT NOT NULL,
  ordinal INTEGER,
  title TEXT,
  identifier_text TEXT,
  processing_title TEXT,
  note TEXT,
  source_item_id INTEGER,
  source_parent_item_id INTEGER,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (minutes_document_id) REFERENCES Document(id)
);

CREATE INDEX idx_minutes_item_session ON SessionMinutesItem(session_key);

CREATE TABLE SessionMinutesAttachment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  minutes_document_id INTEGER NOT NULL,
  minutes_item_id INTEGER,
  title TEXT,
  related_document_tunnus TEXT,
  file_name TEXT,
  file_path TEXT,
  native_id TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (minutes_document_id) REFERENCES Document(id),
  FOREIGN KEY (minutes_item_id) REFERENCES SessionMinutesItem(id)
);

CREATE TABLE SessionSectionSpeech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  minutes_item_id INTEGER,
  source_document_id INTEGER,
  section_ordinal INTEGER,
  speech_ordinal INTEGER,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  position TEXT,
  speech_type TEXT,
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  link_key TEXT,
  source_item_id INTEGER,
  source_path TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key),
  FOREIGN KEY (minutes_item_id) REFERENCES SessionMinutesItem(id),
  FOREIGN KEY (source_document_id) REFERENCES Document(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE INDEX idx_sss_session_section ON SessionSectionSpeech(session_key, section_key);

CREATE INDEX idx_sss_person ON SessionSectionSpeech(person_id);

CREATE INDEX idx_sss_start_time ON SessionSectionSpeech(start_time);

CREATE TABLE SectionDocumentMap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  confidence TEXT NOT NULL,
  source_field TEXT,
  created_at TEXT,
  FOREIGN KEY (section_key) REFERENCES Section(key),
  FOREIGN KEY (document_id) REFERENCES Document(id),
  UNIQUE (section_key, document_id, link_type)
);

CREATE TABLE SessionDocumentMap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  confidence TEXT NOT NULL,
  source_field TEXT,
  created_at TEXT,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (document_id) REFERENCES Document(id),
  UNIQUE (session_key, document_id, link_type)
);

CREATE TABLE CommitteeSessionDocumentMap (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  committee_session_id INTEGER NOT NULL,
  document_id INTEGER NOT NULL,
  role TEXT,
  confidence TEXT NOT NULL,
  source_field TEXT,
  created_at TEXT,
  FOREIGN KEY (committee_session_id) REFERENCES CommitteeSession(id),
  FOREIGN KEY (document_id) REFERENCES Document(id),
  UNIQUE (committee_session_id, document_id, role)
);

CREATE TABLE DocumentSectionEvent (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  section_key TEXT,
  event_ordinal INTEGER,
  event_date TEXT,
  phase_code TEXT,
  phase_title TEXT,
  action_code TEXT,
  action_text TEXT,
  actor_summary TEXT,
  source_field TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id),
  FOREIGN KEY (section_key) REFERENCES Section(key)
);

CREATE TABLE DocumentOther (
  document_id INTEGER PRIMARY KEY,
  payload_json TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_hallituksen_esitys (
  document_id INTEGER PRIMARY KEY,
  summary_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  statute_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_kirjallinen_kysymys (
  document_id INTEGER PRIMARY KEY,
  question_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_vastaus_kirjalliseen_kysymykseen (
  document_id INTEGER PRIMARY KEY,
  answer_text TEXT,
  statement_text TEXT,
  signing_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnan_mietinto (
  document_id INTEGER PRIMARY KEY,
  summary_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  minority_opinion_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_valiokunnan_lausunto (
  document_id INTEGER PRIMARY KEY,
  summary_text TEXT,
  decision_text TEXT,
  statement_text TEXT,
  justification_text TEXT,
  minority_opinion_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_paivajarjestys (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  agenda_state TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirja (
  document_id INTEGER PRIMARY KEY,
  meeting_start TEXT,
  meeting_end TEXT,
  summary_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_asiakohta (
  document_id INTEGER PRIMARY KEY,
  header_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_muu_asiakohta (
  document_id INTEGER PRIMARY KEY,
  header_text TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

CREATE TABLE DocType_poytakirjan_liite (
  document_id INTEGER PRIMARY KEY,
  related_document_tunnus TEXT,
  FOREIGN KEY (document_id) REFERENCES Document(id)
);

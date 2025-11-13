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
  excel_key TEXT,                 -- Format: YYYYMMDDHHmmss_<agenda_key>_<processing_title>_<ordinal_number>_<person_id> (for linking to ExcelSpeech)
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE INDEX idx_speech_excel_key ON Speech(excel_key);

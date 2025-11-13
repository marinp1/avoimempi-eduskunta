-- ExcelSpeech table stores speech content from Excel files
-- Links to Speech table via: Speech.excel_key = ExcelSpeech.excel_id
-- Example join: SELECT * FROM Speech s JOIN ExcelSpeech es ON s.excel_key = es.excel_id
CREATE TABLE ExcelSpeech (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  excel_id TEXT UNIQUE,           -- Composite ID: YYYYMMDDHHmmss_<document>_<processing_phase>_<order>_<person_id>
  processing_phase TEXT,
  document TEXT,                  -- Matches Section.agenda_key
  ordinal INTEGER,                -- Matches Speech.ordinal_number
  position TEXT,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  speech_type TEXT,
  start_time TEXT,
  end_time TEXT,
  content TEXT,
  minutes_url TEXT,
  source_file TEXT
);

-- Indexes for efficient lookups and joins
CREATE INDEX idx_excel_speech_excel_id ON ExcelSpeech(excel_id); -- For joining with Speech.excel_key
CREATE INDEX idx_excel_speech_document ON ExcelSpeech(document);
CREATE INDEX idx_excel_speech_party ON ExcelSpeech(party);
CREATE INDEX idx_excel_speech_name ON ExcelSpeech(last_name, first_name);

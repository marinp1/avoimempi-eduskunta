-- ExcelSpeech table stores speech content from Excel files
-- Links to Speech table via: Section.agenda_key = ExcelSpeech.document AND Speech.ordinal_number = ExcelSpeech.ordinal
-- The relationship path is: ExcelSpeech -> Section (via agenda_key) -> Speech (via section_key + ordinal_number)
CREATE TABLE ExcelSpeech (
  id INTEGER PRIMARY KEY,
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

-- Indexes for efficient lookups
CREATE INDEX idx_excel_speech_name ON ExcelSpeech(last_name, first_name);
CREATE INDEX idx_excel_speech_party ON ExcelSpeech(party);
CREATE INDEX idx_excel_speech_document ON ExcelSpeech(document);
CREATE INDEX idx_excel_speech_start_time ON ExcelSpeech(start_time);
-- Composite index for joining with Speech table via Section
CREATE INDEX idx_excel_speech_document_ordinal ON ExcelSpeech(document, ordinal);

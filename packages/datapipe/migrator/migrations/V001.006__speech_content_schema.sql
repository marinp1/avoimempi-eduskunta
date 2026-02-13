CREATE TABLE SpeechContent (
  speech_id INTEGER PRIMARY KEY,
  session_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  source_document_id INTEGER NOT NULL,
  source_item_identifier INTEGER NOT NULL,
  source_entry_order INTEGER NOT NULL,
  source_speech_order INTEGER NOT NULL,
  source_speech_identifier INTEGER,
  speech_type_code TEXT,
  language_code TEXT,
  start_time TEXT,
  end_time TEXT,
  content TEXT NOT NULL CHECK (TRIM(content) <> ''),
  source_path TEXT NOT NULL,
  FOREIGN KEY (speech_id) REFERENCES Speech(id),
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key)
);

CREATE INDEX idx_speech_content_session ON SpeechContent(session_key);

CREATE INDEX idx_speech_content_section ON SpeechContent(section_key);

CREATE INDEX idx_speech_content_source_document ON SpeechContent(source_document_id);

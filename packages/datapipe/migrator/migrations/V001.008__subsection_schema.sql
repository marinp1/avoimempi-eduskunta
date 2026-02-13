CREATE TABLE SubSection (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  section_key TEXT NOT NULL,
  entry_order INTEGER NOT NULL,
  entry_kind TEXT NOT NULL CHECK(entry_kind IN ('asiakohta', 'muu_asiakohta')),
  item_identifier INTEGER NOT NULL,
  parent_item_identifier TEXT,
  item_number TEXT,
  item_order INTEGER,
  item_title TEXT,
  related_document_identifier TEXT,
  related_document_type TEXT,
  processing_phase_code TEXT,
  general_processing_phase_code TEXT,
  content_text TEXT,
  match_mode TEXT NOT NULL CHECK(match_mode IN ('direct', 'parent_fallback')),
  minutes_document_id INTEGER NOT NULL,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (section_key) REFERENCES Section(key),
  UNIQUE (section_key, entry_order)
);

CREATE INDEX idx_subsection_session_key ON SubSection(session_key);

CREATE INDEX idx_subsection_section_key ON SubSection(section_key);

CREATE INDEX idx_subsection_related_document_identifier ON SubSection(related_document_identifier);

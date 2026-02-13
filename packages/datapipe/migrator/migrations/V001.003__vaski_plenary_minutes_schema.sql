CREATE TABLE PlenarySessionMinutes (
  id INTEGER PRIMARY KEY,
  session_key TEXT NOT NULL UNIQUE,
  parliament_identifier TEXT NOT NULL,
  session_number INTEGER NOT NULL CHECK(session_number > 0),
  parliamentary_year INTEGER NOT NULL CHECK(parliamentary_year > 0),
  session_date TEXT NOT NULL,
  session_start_time TEXT NOT NULL,
  session_end_time TEXT NOT NULL,
  title TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  edk_identifier TEXT NOT NULL UNIQUE,
  source_path TEXT NOT NULL,
  attachment_group_id INTEGER,
  has_signature INTEGER NOT NULL DEFAULT 0 CHECK(has_signature IN (0, 1)),
  agenda_item_count INTEGER NOT NULL DEFAULT 0 CHECK(agenda_item_count >= 0),
  other_item_count INTEGER NOT NULL DEFAULT 0 CHECK(other_item_count >= 0),
  FOREIGN KEY (session_key) REFERENCES Session(key)
);

CREATE TABLE PlenarySessionMinutesItem (
  minutes_id INTEGER NOT NULL,
  entry_order INTEGER NOT NULL CHECK(entry_order > 0),
  entry_kind TEXT NOT NULL CHECK(entry_kind IN ('asiakohta', 'muu_asiakohta')),
  item_number TEXT NOT NULL,
  item_title TEXT,
  related_document_identifier TEXT,
  related_document_type TEXT,
  item_identifier TEXT NOT NULL,
  parent_item_identifier TEXT,
  processing_phase_code TEXT,
  general_processing_phase_code TEXT,
  item_order INTEGER NOT NULL CHECK(item_order > 0),
  content_text TEXT,
  CHECK ((related_document_identifier IS NULL) = (related_document_type IS NULL)),
  CHECK ((processing_phase_code IS NULL) = (general_processing_phase_code IS NULL)),
  CHECK (
    item_title IS NOT NULL OR
    related_document_identifier IS NOT NULL OR
    content_text IS NOT NULL
  ),
  PRIMARY KEY (minutes_id, entry_order),
  FOREIGN KEY (minutes_id) REFERENCES PlenarySessionMinutes(id)
);

CREATE INDEX idx_plenary_minutes_session_key ON PlenarySessionMinutes(session_key);

CREATE INDEX idx_plenary_minutes_date ON PlenarySessionMinutes(session_date);

CREATE INDEX idx_plenary_minutes_item_minutes ON PlenarySessionMinutesItem(minutes_id);

CREATE INDEX idx_plenary_minutes_item_related_doc ON PlenarySessionMinutesItem(related_document_identifier);

ALTER TABLE VaskiDocument ADD COLUMN content_root_type TEXT;

CREATE TABLE VaskiSectionLink (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  section_key TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  source_section_id INTEGER,
  FOREIGN KEY (section_key) REFERENCES Section(key),
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  UNIQUE (section_key, document_id, link_type)
);

CREATE TABLE VaskiSessionLink (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL,
  document_id INTEGER NOT NULL,
  link_type TEXT NOT NULL,
  FOREIGN KEY (session_key) REFERENCES Session(key),
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id),
  UNIQUE (session_key, document_id, link_type)
);

CREATE INDEX idx_vaski_section_link_section ON VaskiSectionLink(section_key);

CREATE INDEX idx_vaski_section_link_document ON VaskiSectionLink(document_id);

CREATE INDEX idx_vaski_section_link_type ON VaskiSectionLink(link_type);

CREATE INDEX idx_vaski_session_link_session ON VaskiSessionLink(session_key);

CREATE INDEX idx_vaski_session_link_document ON VaskiSessionLink(document_id);

CREATE INDEX idx_vaski_session_link_type ON VaskiSessionLink(link_type);

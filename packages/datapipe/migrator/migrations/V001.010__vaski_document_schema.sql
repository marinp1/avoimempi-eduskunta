CREATE TABLE VaskiDocument (
  id INTEGER PRIMARY KEY,
  eduskunta_tunnus TEXT NOT NULL,
  document_type_code TEXT NOT NULL,
  document_type_name TEXT NOT NULL,
  document_number INTEGER,
  parliamentary_year TEXT,
  title TEXT,
  author_first_name TEXT,
  author_last_name TEXT,
  author_role TEXT,
  author_organization TEXT,
  creation_date TEXT,
  status TEXT,
  language_code TEXT DEFAULT 'fi',
  publicity_code TEXT,
  source_reference TEXT,
  summary TEXT,
  attachment_group_id INTEGER,
  created TEXT
);

CREATE INDEX idx_vaski_doc_tunnus ON VaskiDocument(eduskunta_tunnus);

CREATE INDEX idx_vaski_doc_type ON VaskiDocument(document_type_code);

CREATE INDEX idx_vaski_doc_year ON VaskiDocument(parliamentary_year);

CREATE INDEX idx_vaski_doc_author ON VaskiDocument(author_last_name);

CREATE TABLE DocumentSubject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  document_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  yso_url TEXT,
  FOREIGN KEY (document_id) REFERENCES VaskiDocument(id)
);

CREATE INDEX idx_doc_subject_doc_id ON DocumentSubject(document_id);

CREATE INDEX idx_doc_subject_text ON DocumentSubject(subject_text);

CREATE TABLE DocumentRelationship (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_document_id INTEGER NOT NULL,
  target_eduskunta_tunnus TEXT NOT NULL,
  relationship_type TEXT NOT NULL,
  FOREIGN KEY (source_document_id) REFERENCES VaskiDocument(id)
);

CREATE INDEX idx_doc_rel_source ON DocumentRelationship(source_document_id);

CREATE INDEX idx_doc_rel_target ON DocumentRelationship(target_eduskunta_tunnus);

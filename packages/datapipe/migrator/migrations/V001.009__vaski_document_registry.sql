CREATE TABLE VaskiDocument (
  id INTEGER PRIMARY KEY,
  document_type TEXT NOT NULL,
  edk_identifier TEXT,
  source_path TEXT NOT NULL
);

CREATE INDEX idx_vaski_document_document_type ON VaskiDocument(document_type);

CREATE INDEX idx_vaski_document_edk_identifier ON VaskiDocument(edk_identifier);

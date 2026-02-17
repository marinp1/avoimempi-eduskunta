CREATE TABLE SectionDocumentReference (
  section_key TEXT NOT NULL,
  document_identifier TEXT NOT NULL,
  document_type TEXT,
  PRIMARY KEY (section_key, document_identifier),
  FOREIGN KEY (section_key) REFERENCES Section(key) ON DELETE CASCADE
);

CREATE INDEX idx_section_document_reference_document_identifier
  ON SectionDocumentReference(document_identifier);

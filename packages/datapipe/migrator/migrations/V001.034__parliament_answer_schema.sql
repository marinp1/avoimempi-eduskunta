CREATE TABLE ParliamentAnswer (
  id INTEGER PRIMARY KEY,
  parliament_identifier VARCHAR(64) NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year VARCHAR(16) NOT NULL,
  title TEXT,
  source_reference VARCHAR(64),
  committee_report_reference VARCHAR(64),
  submission_date TEXT,
  signature_date TEXT,
  language VARCHAR(8) NOT NULL DEFAULT 'fi',
  edk_identifier VARCHAR(128),
  decision_text TEXT,
  decision_rich_text TEXT,
  legislation_text TEXT,
  legislation_rich_text TEXT,
  signatory_count INTEGER NOT NULL DEFAULT 0,
  vaski_document_id INTEGER REFERENCES VaskiDocument(id),
  source_path TEXT
);

CREATE TABLE ParliamentAnswerSubject (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  answer_id INTEGER NOT NULL REFERENCES ParliamentAnswer(id),
  subject_order INTEGER NOT NULL,
  subject_text TEXT NOT NULL
);

CREATE INDEX idx_pa_identifier ON ParliamentAnswer(parliament_identifier);

CREATE INDEX idx_pa_year ON ParliamentAnswer(parliamentary_year);

CREATE INDEX idx_pa_source_ref ON ParliamentAnswer(source_reference);

CREATE INDEX idx_pa_sig_date ON ParliamentAnswer(signature_date DESC, id DESC);

CREATE INDEX idx_pa_subject_answer ON ParliamentAnswerSubject(answer_id);

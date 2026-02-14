CREATE TABLE Interpellation (
  id INTEGER PRIMARY KEY,
  parliament_identifier TEXT NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  submission_date TEXT,
  first_signer_person_id INTEGER,
  first_signer_first_name TEXT,
  first_signer_last_name TEXT,
  first_signer_party TEXT,
  co_signer_count INTEGER,
  decision_outcome TEXT,
  decision_outcome_code TEXT,
  question_text TEXT,
  resolution_text TEXT,
  source_path TEXT NOT NULL,
  FOREIGN KEY (first_signer_person_id) REFERENCES Representative(person_id)
);

CREATE TABLE InterpellationSigner (
  interpellation_id INTEGER NOT NULL,
  signer_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  party TEXT,
  is_first_signer INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (interpellation_id, signer_order),
  FOREIGN KEY (interpellation_id) REFERENCES Interpellation(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE InterpellationStage (
  interpellation_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_code TEXT,
  event_date TEXT,
  event_title TEXT,
  event_description TEXT,
  PRIMARY KEY (interpellation_id, stage_order),
  FOREIGN KEY (interpellation_id) REFERENCES Interpellation(id)
);

CREATE TABLE InterpellationSubject (
  interpellation_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  PRIMARY KEY (interpellation_id, subject_text),
  FOREIGN KEY (interpellation_id) REFERENCES Interpellation(id)
);

CREATE INDEX idx_interpellation_year ON Interpellation(parliamentary_year);

CREATE INDEX idx_interpellation_signer ON Interpellation(first_signer_person_id);

CREATE INDEX idx_interpellationsigner_interpellation ON InterpellationSigner(interpellation_id);

CREATE INDEX idx_interpellationstage_interpellation ON InterpellationStage(interpellation_id);

CREATE INDEX idx_interpellationsubject_interpellation ON InterpellationSubject(interpellation_id)
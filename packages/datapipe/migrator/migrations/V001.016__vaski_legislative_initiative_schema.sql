CREATE TABLE LegislativeInitiative (
  id INTEGER PRIMARY KEY,
  initiative_type_code TEXT NOT NULL,
  parliament_identifier TEXT NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  submission_date TEXT,
  first_signer_person_id INTEGER,
  first_signer_first_name TEXT,
  first_signer_last_name TEXT,
  first_signer_party TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  law_text TEXT,
  decision_outcome TEXT,
  decision_outcome_code TEXT,
  latest_stage_code TEXT,
  end_date TEXT,
  vaski_document_id INTEGER,
  source_path TEXT NOT NULL,
  FOREIGN KEY (first_signer_person_id) REFERENCES Representative(person_id),
  FOREIGN KEY (vaski_document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE LegislativeInitiativeSigner (
  initiative_id INTEGER NOT NULL,
  signer_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  party TEXT,
  is_first_signer INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (initiative_id, signer_order),
  FOREIGN KEY (initiative_id) REFERENCES LegislativeInitiative(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE LegislativeInitiativeStage (
  initiative_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_code TEXT,
  event_date TEXT,
  event_title TEXT,
  event_description TEXT,
  PRIMARY KEY (initiative_id, stage_order),
  FOREIGN KEY (initiative_id) REFERENCES LegislativeInitiative(id)
);

CREATE TABLE LegislativeInitiativeSubject (
  initiative_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  yso_uri TEXT,
  PRIMARY KEY (initiative_id, subject_text),
  FOREIGN KEY (initiative_id) REFERENCES LegislativeInitiative(id)
);

CREATE INDEX idx_legislativeinitiative_type ON LegislativeInitiative(initiative_type_code);

CREATE INDEX idx_legislativeinitiative_year ON LegislativeInitiative(parliamentary_year);

CREATE INDEX idx_legislativeinitiative_signer ON LegislativeInitiative(first_signer_person_id);

CREATE INDEX idx_legislativeinitiative_vaski ON LegislativeInitiative(vaski_document_id);

CREATE INDEX idx_legislativeinitiativesigner_initiative ON LegislativeInitiativeSigner(initiative_id);

CREATE INDEX idx_legislativeinitiativestage_initiative ON LegislativeInitiativeStage(initiative_id);

CREATE INDEX idx_legislativeinitiativesubject_initiative ON LegislativeInitiativeSubject(initiative_id);

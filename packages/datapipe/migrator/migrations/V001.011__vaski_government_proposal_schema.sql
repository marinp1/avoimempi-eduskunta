CREATE TABLE GovernmentProposal (
  id INTEGER PRIMARY KEY,
  parliament_identifier TEXT NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  submission_date TEXT,
  author TEXT,
  summary_text TEXT,
  justification_text TEXT,
  proposal_text TEXT,
  appendix_text TEXT,
  signature_date TEXT,
  decision_outcome TEXT,
  decision_outcome_code TEXT,
  law_decision_text TEXT,
  latest_stage_code TEXT,
  end_date TEXT,
  source_path TEXT NOT NULL
);

CREATE TABLE GovernmentProposalSignatory (
  proposal_id INTEGER NOT NULL,
  signatory_order INTEGER NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  title_text TEXT,
  PRIMARY KEY (proposal_id, signatory_order),
  FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

CREATE TABLE GovernmentProposalSubject (
  proposal_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  yso_uri TEXT,
  PRIMARY KEY (proposal_id, subject_text),
  FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

CREATE TABLE GovernmentProposalLaw (
  proposal_id INTEGER NOT NULL,
  law_order INTEGER NOT NULL,
  law_type TEXT,
  law_name TEXT,
  PRIMARY KEY (proposal_id, law_order),
  FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

CREATE TABLE GovernmentProposalStage (
  proposal_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_code TEXT,
  event_date TEXT,
  event_title TEXT,
  event_description TEXT,
  PRIMARY KEY (proposal_id, stage_order),
  FOREIGN KEY (proposal_id) REFERENCES GovernmentProposal(id)
);

CREATE INDEX idx_govproposal_year ON GovernmentProposal(parliamentary_year);

CREATE INDEX idx_govproposal_outcome ON GovernmentProposal(decision_outcome_code);

CREATE INDEX idx_govproposalsignatory_proposal ON GovernmentProposalSignatory(proposal_id);

CREATE INDEX idx_govproposalsubject_proposal ON GovernmentProposalSubject(proposal_id);

CREATE INDEX idx_govproposallaw_proposal ON GovernmentProposalLaw(proposal_id);

CREATE INDEX idx_govproposalstage_proposal ON GovernmentProposalStage(proposal_id)

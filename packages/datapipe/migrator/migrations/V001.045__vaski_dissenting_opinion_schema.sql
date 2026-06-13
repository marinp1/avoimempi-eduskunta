CREATE TABLE CommitteeReportDissent (
  report_id INTEGER NOT NULL,
  dissent_order INTEGER NOT NULL,
  dissent_number INTEGER,
  heading TEXT,
  signature_date TEXT,
  PRIMARY KEY (report_id, dissent_order),
  FOREIGN KEY (report_id) REFERENCES CommitteeReport(id)
);

CREATE TABLE CommitteeReportDissentStatement (
  report_id INTEGER NOT NULL,
  dissent_order INTEGER NOT NULL,
  statement_order INTEGER NOT NULL,
  statement_number INTEGER,
  statement_text TEXT NOT NULL,
  PRIMARY KEY (report_id, dissent_order, statement_order),
  FOREIGN KEY (report_id, dissent_order) REFERENCES CommitteeReportDissent(report_id, dissent_order)
);

CREATE TABLE CommitteeReportDissentSigner (
  report_id INTEGER NOT NULL,
  dissent_order INTEGER NOT NULL,
  signer_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  party TEXT,
  PRIMARY KEY (report_id, dissent_order, signer_order),
  FOREIGN KEY (report_id, dissent_order) REFERENCES CommitteeReportDissent(report_id, dissent_order),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE PlenaryAnnex (
  id INTEGER PRIMARY KEY,
  edk_identifier TEXT,
  title TEXT,
  source_reference TEXT,
  session_key TEXT,
  meeting_date TEXT,
  draft_date TEXT,
  source_path TEXT NOT NULL
);

CREATE INDEX idx_dissentstatement_report ON CommitteeReportDissentStatement(report_id, dissent_order);

CREATE INDEX idx_dissentsigner_person ON CommitteeReportDissentSigner(person_id);

CREATE INDEX idx_plenaryannex_source ON PlenaryAnnex(source_reference, session_key);

CREATE INDEX idx_committeereport_source_reference ON CommitteeReport(source_reference);

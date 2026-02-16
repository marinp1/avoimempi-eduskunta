CREATE TABLE CommitteeReport (
  id INTEGER PRIMARY KEY,
  parliament_identifier TEXT NOT NULL UNIQUE,
  report_type_code TEXT NOT NULL,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  committee_name TEXT,
  source_reference TEXT,
  draft_date TEXT,
  signature_date TEXT,
  language TEXT DEFAULT 'fi',
  edk_identifier TEXT,
  summary_text TEXT,
  general_reasoning_text TEXT,
  detailed_reasoning_text TEXT,
  decision_text TEXT,
  legislation_amendment_text TEXT,
  minority_opinion_text TEXT,
  resolution_text TEXT,
  vaski_document_id INTEGER,
  source_path TEXT NOT NULL,
  FOREIGN KEY (vaski_document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE CommitteeReportMember (
  report_id INTEGER NOT NULL,
  member_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  party TEXT,
  role TEXT,
  PRIMARY KEY (report_id, member_order),
  FOREIGN KEY (report_id) REFERENCES CommitteeReport(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE CommitteeReportExpert (
  report_id INTEGER NOT NULL,
  expert_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT,
  last_name TEXT,
  title TEXT,
  organization TEXT,
  PRIMARY KEY (report_id, expert_order),
  FOREIGN KEY (report_id) REFERENCES CommitteeReport(id)
);

CREATE INDEX idx_committeereport_year ON CommitteeReport(parliamentary_year);

CREATE INDEX idx_committeereport_source ON CommitteeReport(source_reference);

CREATE INDEX idx_committeereport_committee ON CommitteeReport(committee_name);

CREATE INDEX idx_committeereportmember_report ON CommitteeReportMember(report_id);

CREATE INDEX idx_committeereportmember_person ON CommitteeReportMember(person_id);

CREATE INDEX idx_committeereportexpert_report ON CommitteeReportExpert(report_id);

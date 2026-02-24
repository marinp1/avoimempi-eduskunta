CREATE TABLE ExpertStatement (
  id INTEGER PRIMARY KEY,
  document_type TEXT NOT NULL CHECK(document_type IN ('asiantuntijalausunto', 'asiantuntijalausunnon_liite', 'asiantuntijasuunnitelma')),
  edk_identifier TEXT NOT NULL UNIQUE,
  bill_identifier TEXT,
  committee_name TEXT,
  meeting_identifier TEXT,
  meeting_date TEXT,
  title TEXT,
  publicity TEXT,
  language TEXT,
  status INTEGER NOT NULL DEFAULT 5,
  created TEXT,
  source_path TEXT NOT NULL
);

CREATE INDEX idx_expertstatement_bill ON ExpertStatement(bill_identifier);

CREATE INDEX idx_expertstatement_committee ON ExpertStatement(committee_name);

CREATE INDEX idx_expertstatement_meeting_date ON ExpertStatement(meeting_date);

CREATE INDEX idx_expertstatement_type ON ExpertStatement(document_type);

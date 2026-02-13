CREATE TABLE RollCallReport (
  id INTEGER PRIMARY KEY,
  parliament_identifier TEXT NOT NULL,
  session_date TEXT NOT NULL,
  roll_call_start_time TEXT,
  roll_call_end_time TEXT,
  title TEXT,
  status TEXT,
  created_at TEXT,
  edk_identifier TEXT NOT NULL UNIQUE,
  source_path TEXT NOT NULL,
  attachment_group_id INTEGER
);

CREATE TABLE RollCallEntry (
  roll_call_id INTEGER NOT NULL,
  entry_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  party TEXT,
  entry_type TEXT NOT NULL CHECK(entry_type IN ('absent', 'late')),
  absence_reason TEXT,
  arrival_time TEXT,
  PRIMARY KEY (roll_call_id, entry_order),
  FOREIGN KEY (roll_call_id) REFERENCES RollCallReport(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE INDEX idx_rollcallreport_date ON RollCallReport(session_date);

CREATE INDEX idx_rollcallentry_roll_call ON RollCallEntry(roll_call_id);

CREATE INDEX idx_rollcallentry_person ON RollCallEntry(person_id);

CREATE INDEX idx_rollcallentry_roll_call_type ON RollCallEntry(roll_call_id, entry_type);

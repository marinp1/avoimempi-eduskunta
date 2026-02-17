CREATE TABLE OralQuestion (
  id INTEGER PRIMARY KEY,
  parliament_identifier TEXT NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  question_text TEXT,
  asker_text TEXT,
  submission_date TEXT,
  decision_outcome TEXT,
  decision_outcome_code TEXT,
  latest_stage_code TEXT,
  end_date TEXT,
  vaski_document_id INTEGER,
  source_path TEXT NOT NULL,
  FOREIGN KEY (vaski_document_id) REFERENCES VaskiDocument(id)
);

CREATE TABLE OralQuestionStage (
  question_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_code TEXT,
  event_date TEXT,
  event_title TEXT,
  event_description TEXT,
  PRIMARY KEY (question_id, stage_order),
  FOREIGN KEY (question_id) REFERENCES OralQuestion(id)
);

CREATE TABLE OralQuestionSubject (
  question_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  yso_uri TEXT,
  PRIMARY KEY (question_id, subject_text),
  FOREIGN KEY (question_id) REFERENCES OralQuestion(id)
);

CREATE INDEX idx_oralquestion_year ON OralQuestion(parliamentary_year);

CREATE INDEX idx_oralquestion_vaski ON OralQuestion(vaski_document_id);

CREATE INDEX idx_oralquestionstage_question ON OralQuestionStage(question_id);

CREATE INDEX idx_oralquestionsubject_question ON OralQuestionSubject(question_id);

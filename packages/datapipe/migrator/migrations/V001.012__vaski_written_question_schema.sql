CREATE TABLE WrittenQuestion (
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
  question_text TEXT,
  answer_parliament_identifier TEXT,
  answer_minister_title TEXT,
  answer_minister_first_name TEXT,
  answer_minister_last_name TEXT,
  answer_date TEXT,
  decision_outcome TEXT,
  decision_outcome_code TEXT,
  latest_stage_code TEXT,
  end_date TEXT,
  source_path TEXT NOT NULL,
  FOREIGN KEY (first_signer_person_id) REFERENCES Representative(person_id)
);

CREATE TABLE WrittenQuestionSigner (
  question_id INTEGER NOT NULL,
  signer_order INTEGER NOT NULL,
  person_id INTEGER,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  party TEXT,
  is_first_signer INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (question_id, signer_order),
  FOREIGN KEY (question_id) REFERENCES WrittenQuestion(id),
  FOREIGN KEY (person_id) REFERENCES Representative(person_id)
);

CREATE TABLE WrittenQuestionStage (
  question_id INTEGER NOT NULL,
  stage_order INTEGER NOT NULL,
  stage_title TEXT NOT NULL,
  stage_code TEXT,
  event_date TEXT,
  event_title TEXT,
  event_description TEXT,
  PRIMARY KEY (question_id, stage_order),
  FOREIGN KEY (question_id) REFERENCES WrittenQuestion(id)
);

CREATE TABLE WrittenQuestionSubject (
  question_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  PRIMARY KEY (question_id, subject_text),
  FOREIGN KEY (question_id) REFERENCES WrittenQuestion(id)
);

CREATE INDEX idx_writtenquestion_year ON WrittenQuestion(parliamentary_year);

CREATE INDEX idx_writtenquestion_signer ON WrittenQuestion(first_signer_person_id);

CREATE INDEX idx_writtenquestionsigner_question ON WrittenQuestionSigner(question_id);

CREATE INDEX idx_writtenquestionstage_question ON WrittenQuestionStage(question_id);

CREATE INDEX idx_writtenquestionsubject_question ON WrittenQuestionSubject(question_id)

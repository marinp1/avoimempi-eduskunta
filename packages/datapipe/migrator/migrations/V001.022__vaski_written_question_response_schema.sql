CREATE TABLE WrittenQuestionResponse (
  id INTEGER PRIMARY KEY,
  question_id INTEGER NOT NULL,
  parliament_identifier TEXT NOT NULL UNIQUE,
  document_number INTEGER NOT NULL,
  parliamentary_year TEXT NOT NULL,
  title TEXT,
  answer_date TEXT,
  minister_title TEXT,
  minister_first_name TEXT,
  minister_last_name TEXT,
  vaski_guid TEXT,
  edk_identifier TEXT,
  status INTEGER NOT NULL DEFAULT 5,
  created TEXT,
  source_path TEXT NOT NULL,
  FOREIGN KEY (question_id) REFERENCES WrittenQuestion(id)
);

CREATE TABLE WrittenQuestionResponseSubject (
  response_id INTEGER NOT NULL,
  subject_text TEXT NOT NULL,
  PRIMARY KEY (response_id, subject_text),
  FOREIGN KEY (response_id) REFERENCES WrittenQuestionResponse(id)
);

CREATE INDEX idx_writtenquestionresponse_question ON WrittenQuestionResponse(question_id);

CREATE INDEX idx_writtenquestionresponse_year ON WrittenQuestionResponse(parliamentary_year);

CREATE INDEX idx_writtenquestionresponse_minister ON WrittenQuestionResponse(minister_last_name);

CREATE INDEX idx_writtenquestionresponsesubject_response ON WrittenQuestionResponseSubject(response_id);

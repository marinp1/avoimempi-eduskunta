CREATE INDEX IF NOT EXISTS idx_interpellationsigner_person_interpellation ON InterpellationSigner(person_id, interpellation_id);

CREATE INDEX IF NOT EXISTS idx_writtenquestionsigner_person_question ON WrittenQuestionSigner(person_id, question_id);

ALTER TABLE VaskiDocument ADD COLUMN title TEXT;

ALTER TABLE GovernmentProposal ADD COLUMN vaski_document_id INTEGER REFERENCES VaskiDocument(id);

ALTER TABLE Interpellation ADD COLUMN vaski_document_id INTEGER REFERENCES VaskiDocument(id);

ALTER TABLE WrittenQuestion ADD COLUMN vaski_document_id INTEGER REFERENCES VaskiDocument(id);

CREATE INDEX idx_govproposal_vaski_document ON GovernmentProposal(vaski_document_id);

CREATE INDEX idx_interpellation_vaski_document ON Interpellation(vaski_document_id);

CREATE INDEX idx_writtenquestion_vaski_document ON WrittenQuestion(vaski_document_id)

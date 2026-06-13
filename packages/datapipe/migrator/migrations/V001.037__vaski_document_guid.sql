ALTER TABLE VaskiDocument ADD COLUMN vaski_guid TEXT;

CREATE INDEX idx_vaski_document_vaski_guid ON VaskiDocument(vaski_guid);

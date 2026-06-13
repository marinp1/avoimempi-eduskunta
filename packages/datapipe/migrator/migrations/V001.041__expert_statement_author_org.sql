ALTER TABLE ExpertStatement ADD COLUMN author_organization TEXT;

CREATE INDEX idx_expert_statement_author_organization ON ExpertStatement(author_organization);

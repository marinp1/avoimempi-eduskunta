ALTER TABLE Term ADD COLUMN start_year INTEGER;

ALTER TABLE Term ADD COLUMN end_year INTEGER;

CREATE INDEX idx_term_start_year ON Term(start_year);

CREATE INDEX idx_term_end_year ON Term(end_year);

CREATE INDEX idx_term_person_years ON Term(person_id, start_year, end_year);

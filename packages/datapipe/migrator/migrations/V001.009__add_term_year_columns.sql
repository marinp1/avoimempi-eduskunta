-- Add year columns to Term table to optimize year-based queries
-- This avoids repeated SUBSTR and CAST operations in queries

ALTER TABLE Term ADD COLUMN start_year INTEGER;
ALTER TABLE Term ADD COLUMN end_year INTEGER;

-- Create indexes for year-based queries
CREATE INDEX idx_term_start_year ON Term(start_year);
CREATE INDEX idx_term_end_year ON Term(end_year);
CREATE INDEX idx_term_person_years ON Term(person_id, start_year, end_year);

CREATE TABLE IF NOT EXISTS PersonMetric (
  person_id INTEGER NOT NULL PRIMARY KEY,
  party TEXT,
  speech_count INTEGER NOT NULL,
  initiative_count INTEGER NOT NULL,
  interpellation_count INTEGER NOT NULL,
  written_question_count INTEGER NOT NULL,
  vote_total INTEGER NOT NULL,
  vote_cast INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_personmetric_party ON PersonMetric(party);

CREATE TABLE IF NOT EXISTS PartySummary (
  party_code TEXT NOT NULL PRIMARY KEY,
  party_display_code TEXT NOT NULL,
  party_name TEXT NOT NULL,
  member_count INTEGER NOT NULL,
  is_in_government INTEGER NOT NULL,
  votes_cast INTEGER NOT NULL,
  total_votings INTEGER NOT NULL,
  participation_rate REAL NOT NULL,
  female_count INTEGER NOT NULL,
  male_count INTEGER NOT NULL,
  average_age REAL NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_partysummary_party ON PartySummary(party_code);

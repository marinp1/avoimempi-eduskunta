-- Performance indexes for party participation query and other analytics

-- Index for Voting table on start_time (used in date range queries)
CREATE INDEX IF NOT EXISTS idx_voting_start_time ON Voting(start_time);

-- Index for Vote table on person_id and voting_id (used in joins)
CREATE INDEX IF NOT EXISTS idx_vote_person_voting ON Vote(person_id, voting_id);

-- Index for Vote table on voting_id alone (used in joins from Voting)
CREATE INDEX IF NOT EXISTS idx_vote_voting_id ON Vote(voting_id);

-- Index for ParliamentaryGroupMembership on person_id and date range
CREATE INDEX IF NOT EXISTS idx_pgm_person_dates ON ParliamentaryGroupMembership(person_id, start_date, end_date);

-- Index for ParliamentaryGroupMembership on group_name (used in filtering)
CREATE INDEX IF NOT EXISTS idx_pgm_group_name ON ParliamentaryGroupMembership(group_name);

-- Index for GovernmentMembership on government (used in grouping)
CREATE INDEX IF NOT EXISTS idx_gm_government ON GovernmentMembership(government);

-- Index for GovernmentMembership on person_id and government (used in joins)
CREATE INDEX IF NOT EXISTS idx_gm_person_government ON GovernmentMembership(person_id, government);

-- Index for GovernmentMembership on date range
CREATE INDEX IF NOT EXISTS idx_gm_dates ON GovernmentMembership(start_date, end_date);

-- Index for Term table on person_id and dates (used in time series queries)
CREATE INDEX IF NOT EXISTS idx_term_person_dates ON Term(person_id, start_date, end_date);

-- Index for Representative on gender (used in gender division queries)
CREATE INDEX IF NOT EXISTS idx_representative_gender ON Representative(gender);

-- Index for Representative on birth_date (used in age division queries)
CREATE INDEX IF NOT EXISTS idx_representative_birth_date ON Representative(birth_date);

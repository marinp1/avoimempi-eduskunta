CREATE INDEX IF NOT EXISTS idx_voting_start_time ON Voting(start_time);

CREATE INDEX IF NOT EXISTS idx_vote_person_voting ON Vote(person_id, voting_id);

CREATE INDEX IF NOT EXISTS idx_vote_voting_id ON Vote(voting_id);

CREATE INDEX IF NOT EXISTS idx_pgm_person_dates ON ParliamentaryGroupMembership(person_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_pgm_group_name ON ParliamentaryGroupMembership(group_name);

CREATE INDEX IF NOT EXISTS idx_gm_government ON GovernmentMembership(government);

CREATE INDEX IF NOT EXISTS idx_gm_person_government ON GovernmentMembership(person_id, government);

CREATE INDEX IF NOT EXISTS idx_gm_dates ON GovernmentMembership(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_term_person_dates ON Term(person_id, start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_representative_gender ON Representative(gender);

CREATE INDEX IF NOT EXISTS idx_representative_birth_date ON Representative(birth_date);

DROP INDEX IF EXISTS idx_vote_person_voting;

CREATE INDEX IF NOT EXISTS idx_vote_person_covering ON Vote(person_id, voting_id, vote, group_abbreviation);

CREATE INDEX IF NOT EXISTS idx_government_start_desc ON Government(start_date DESC, id DESC);

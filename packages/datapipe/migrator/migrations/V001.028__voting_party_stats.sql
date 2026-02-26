CREATE TABLE IF NOT EXISTS VotingPartyStats (
  voting_id INTEGER NOT NULL,
  party TEXT NOT NULL,
  votes_cast INTEGER NOT NULL,
  total_votings INTEGER NOT NULL,
  party_member_count INTEGER NOT NULL,
  PRIMARY KEY (voting_id, party),
  FOREIGN KEY (voting_id) REFERENCES Voting(id)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_votingpartystats_party ON VotingPartyStats(party);

ALTER TABLE VotingPartyStats ADD COLUMN n_jaa INTEGER NOT NULL DEFAULT 0;

ALTER TABLE VotingPartyStats ADD COLUMN n_ei INTEGER NOT NULL DEFAULT 0;

ALTER TABLE VotingPartyStats ADD COLUMN n_tyhjaa INTEGER NOT NULL DEFAULT 0;

ALTER TABLE VotingPartyStats ADD COLUMN n_poissa INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS PersonVotingDailyStats (
  person_id INTEGER NOT NULL,
  voting_date TEXT NOT NULL,
  votes_cast INTEGER NOT NULL,
  total_votings INTEGER NOT NULL,
  PRIMARY KEY (person_id, voting_date)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_personvotingdaily_voting_date_person ON PersonVotingDailyStats(voting_date, person_id);

CREATE TABLE IF NOT EXISTS PersonSpeechDailyStats (
  person_id INTEGER NOT NULL,
  speech_date TEXT NOT NULL,
  speech_count INTEGER NOT NULL,
  total_words INTEGER NOT NULL,
  first_speech TEXT,
  last_speech TEXT,
  PRIMARY KEY (person_id, speech_date)
) WITHOUT ROWID;

CREATE INDEX IF NOT EXISTS idx_personspeechdaily_speech_date_person ON PersonSpeechDailyStats(speech_date, person_id);

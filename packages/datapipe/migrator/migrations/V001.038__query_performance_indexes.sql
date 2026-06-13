CREATE INDEX IF NOT EXISTS idx_session_type ON Session(type);

CREATE INDEX IF NOT EXISTS idx_voting_annulled_session ON Voting(annulled, session_key);

CREATE INDEX IF NOT EXISTS idx_section_kind_session ON Section(minutes_entry_kind, session_key);

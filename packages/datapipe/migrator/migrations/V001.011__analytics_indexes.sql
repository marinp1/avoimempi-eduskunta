CREATE INDEX IF NOT EXISTS idx_vote_group ON Vote(group_abbrviation);

CREATE INDEX IF NOT EXISTS idx_vote_vote ON Vote(vote);

CREATE INDEX IF NOT EXISTS idx_vote_group_vote ON Vote(group_abbrviation, vote);

CREATE INDEX IF NOT EXISTS idx_excel_speech_start ON ExcelSpeech(start_time);

CREATE INDEX IF NOT EXISTS idx_excel_speech_party ON ExcelSpeech(party);

CREATE INDEX IF NOT EXISTS idx_excel_speech_last_name ON ExcelSpeech(last_name, first_name);

CREATE INDEX IF NOT EXISTS idx_session_date ON Session(date);

CREATE INDEX IF NOT EXISTS idx_session_year ON Session(year);

CREATE INDEX IF NOT EXISTS idx_committee_membership_person ON CommitteeMembership(person_id);

CREATE INDEX IF NOT EXISTS idx_committee_membership_committee ON CommitteeMembership(committee_code);

CREATE INDEX IF NOT EXISTS idx_vaski_document_type ON VaskiDocument(document_type_code);

CREATE INDEX IF NOT EXISTS idx_vaski_document_creation_date ON VaskiDocument(creation_date);

CREATE INDEX IF NOT EXISTS idx_document_subject_document ON DocumentSubject(document_id);

CREATE INDEX IF NOT EXISTS idx_document_subject_text ON DocumentSubject(subject_text);

CREATE INDEX IF NOT EXISTS idx_voting_session_key ON Voting(session_key);

CREATE INDEX IF NOT EXISTS idx_section_session_key ON Section(session_key);

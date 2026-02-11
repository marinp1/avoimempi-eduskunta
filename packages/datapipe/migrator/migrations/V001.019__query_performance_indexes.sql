CREATE INDEX IF NOT EXISTS idx_section_session_ordinal ON Section(session_key, ordinal);

CREATE INDEX IF NOT EXISTS idx_voting_section_key ON Voting(section_key);

CREATE INDEX IF NOT EXISTS idx_speech_section_key ON Speech(section_key);

CREATE INDEX IF NOT EXISTS idx_speech_section_person ON Speech(section_key, person_id);

CREATE INDEX IF NOT EXISTS idx_speech_section_party ON Speech(section_key, party_abbreviation);

CREATE INDEX IF NOT EXISTS idx_vaski_actor_doc_role_id ON VaskiDocumentActor(document_id, role_code, id);

CREATE INDEX IF NOT EXISTS idx_vaski_relationship_doc_type_id ON VaskiRelationship(document_id, relationship_type, id);

CREATE INDEX IF NOT EXISTS idx_vaski_subject_doc_text ON VaskiSubject(document_id, subject_text);

CREATE INDEX IF NOT EXISTS idx_vote_voting_group_vote ON Vote(voting_id, group_abbreviation, vote);

CREATE INDEX IF NOT EXISTS idx_vote_vote_voting_group ON Vote(vote, voting_id, group_abbreviation);

CREATE INDEX IF NOT EXISTS idx_pgm_end_group_person ON ParliamentaryGroupMembership(end_date, group_code, person_id);

CREATE INDEX IF NOT EXISTS idx_term_years_person ON Term(start_year, end_year, person_id);

CREATE INDEX IF NOT EXISTS idx_voting_start_date_expr ON Voting(SUBSTR(start_time, 1, 10));

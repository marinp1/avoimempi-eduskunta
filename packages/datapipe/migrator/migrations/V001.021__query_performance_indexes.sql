DROP INDEX IF EXISTS idx_voting_start_date_expr;

CREATE INDEX idx_voting_session_number ON Voting(session_key, number);

CREATE INDEX idx_representative_sort_name_person_id ON Representative(sort_name, person_id);

CREATE INDEX idx_trust_position_person_period ON TrustPosition(person_id, period);

CREATE INDEX idx_people_leaving_parliament_person_end_date ON PeopleLeavingParliament(person_id, end_date);

CREATE INDEX idx_rollcallreport_parliament_identifier ON RollCallReport(parliament_identifier);

CREATE INDEX idx_section_session_vaski_modified_id ON Section(session_key, vaski_id, modified_datetime, id);

CREATE INDEX idx_speech_section_created_id ON Speech(section_key, created_datetime, id);

CREATE INDEX idx_speech_person_id ON Speech(person_id);

CREATE INDEX idx_vaski_doc_tunnus ON VaskiDocument(eduskunta_tunnus);

CREATE INDEX idx_vaski_doc_type ON VaskiDocument(document_type_name);

CREATE INDEX idx_vaski_doc_created ON VaskiDocument(created);

CREATE INDEX idx_vaski_doc_meeting ON VaskiDocument(meeting_id);

CREATE INDEX idx_vaski_subject_text ON VaskiSubject(subject_text);

CREATE INDEX idx_vaski_actor_person ON VaskiDocumentActor(person_id);

CREATE INDEX idx_vaski_minutes_speech_person ON VaskiMinutesSpeech(person_id);

CREATE INDEX idx_vaski_minutes_speech_start ON VaskiMinutesSpeech(start_time);

CREATE INDEX idx_vaski_agenda_item_doc ON VaskiAgendaItem(document_id);

CREATE INDEX idx_vaski_agenda_item_tunnus ON VaskiAgendaItem(related_document_tunnus);

CREATE INDEX idx_vaski_identifier_value ON VaskiIdentifier(identifier_value);

CREATE INDEX idx_voting_document_link_voting ON VotingDocumentLink(voting_id);

CREATE INDEX idx_section_document_link_section ON SectionDocumentLink(section_key);

CREATE INDEX idx_session_notice_session ON SessionNotice(session_key);

CREATE INDEX idx_session_notice_section ON SessionNotice(section_key);

CREATE INDEX idx_voting_distribution_voting ON VotingDistribution(voting_id);

CREATE INDEX idx_salidb_docref_tunnus ON SaliDBDocumentReference(document_tunnus);

CREATE INDEX idx_salidb_docref_voting ON SaliDBDocumentReference(voting_id);

CREATE INDEX idx_salidb_docref_section ON SaliDBDocumentReference(section_key);

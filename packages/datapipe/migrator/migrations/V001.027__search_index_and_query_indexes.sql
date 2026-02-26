CREATE VIRTUAL TABLE IF NOT EXISTS FederatedSearchFts USING fts5(
  type UNINDEXED,
  record_id UNINDEXED,
  title,
  subtitle,
  body,
  date UNINDEXED,
  tokenize = 'unicode61 remove_diacritics 2'
);

CREATE INDEX IF NOT EXISTS idx_govproposal_submission_date_id ON GovernmentProposal(submission_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_legislativeinitiative_submission_date_id ON LegislativeInitiative(submission_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_oralquestion_submission_date_id ON OralQuestion(submission_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_writtenquestion_submission_date_id ON WrittenQuestion(submission_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_writtenquestionresponse_answer_date_id ON WrittenQuestionResponse(answer_date DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_committeereport_effective_date_id ON CommitteeReport(COALESCE(signature_date, draft_date) DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_interpellationsubject_subject_interpellation ON InterpellationSubject(subject_text, interpellation_id);

CREATE INDEX IF NOT EXISTS idx_govproposalsubject_subject_proposal ON GovernmentProposalSubject(subject_text, proposal_id);

CREATE INDEX IF NOT EXISTS idx_legislativeinitiativesubject_subject_initiative ON LegislativeInitiativeSubject(subject_text, initiative_id);

CREATE INDEX IF NOT EXISTS idx_oralquestionsubject_subject_question ON OralQuestionSubject(subject_text, question_id);

CREATE INDEX IF NOT EXISTS idx_writtenquestionsubject_subject_question ON WrittenQuestionSubject(subject_text, question_id);

CREATE INDEX IF NOT EXISTS idx_writtenquestionresponsesubject_subject_response ON WrittenQuestionResponseSubject(subject_text, response_id);

CREATE INDEX IF NOT EXISTS idx_vote_voting_group_person_vote ON Vote(voting_id, group_abbreviation, person_id, vote);

CREATE INDEX IF NOT EXISTS idx_writtenquestion_answer_identifier ON WrittenQuestion(answer_parliament_identifier);

CREATE INDEX IF NOT EXISTS idx_sectiondocumentlink_section_url_id ON SectionDocumentLink(section_key, link_url_fi, id);

CREATE INDEX IF NOT EXISTS idx_salidbdocref_section_sourceurl_id ON SaliDBDocumentReference(section_key, source_url, id);

CREATE INDEX IF NOT EXISTS idx_pgm_groupabbr_end_start_id ON ParliamentaryGroupMembership(group_abbreviation, end_date, start_date, id);

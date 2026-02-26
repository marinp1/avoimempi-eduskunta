DROP INDEX IF EXISTS idx_import_source_reference_lookup;

DROP INDEX IF EXISTS idx_import_source_reference_scraped_at;

CREATE INDEX IF NOT EXISTS idx_import_source_reference_source_table ON ImportSourceReference(source_table);

DROP INDEX IF EXISTS idx_govproposal_outcome;

DROP INDEX IF EXISTS idx_committeereportmember_person;

DROP INDEX IF EXISTS idx_speech_content_session;

DROP INDEX IF EXISTS idx_speech_content_section;

DROP INDEX IF EXISTS idx_speech_content_source_document;

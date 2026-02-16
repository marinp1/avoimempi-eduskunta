ALTER TABLE CommitteeReport ADD COLUMN recipient_committee TEXT;

CREATE INDEX idx_committeereport_recipient ON CommitteeReport(recipient_committee);

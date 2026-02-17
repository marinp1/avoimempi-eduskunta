ALTER TABLE GovernmentProposal ADD COLUMN summary_rich_text TEXT CHECK (summary_rich_text IS NULL OR json_valid(summary_rich_text));

ALTER TABLE GovernmentProposal ADD COLUMN justification_rich_text TEXT CHECK (justification_rich_text IS NULL OR json_valid(justification_rich_text));

ALTER TABLE GovernmentProposal ADD COLUMN proposal_rich_text TEXT CHECK (proposal_rich_text IS NULL OR json_valid(proposal_rich_text));

ALTER TABLE GovernmentProposal ADD COLUMN appendix_rich_text TEXT CHECK (appendix_rich_text IS NULL OR json_valid(appendix_rich_text));

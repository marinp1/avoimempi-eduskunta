ALTER TABLE LegislativeInitiative ADD COLUMN justification_rich_text TEXT CHECK (justification_rich_text IS NULL OR json_valid(justification_rich_text));

ALTER TABLE LegislativeInitiative ADD COLUMN proposal_rich_text TEXT CHECK (proposal_rich_text IS NULL OR json_valid(proposal_rich_text));

ALTER TABLE LegislativeInitiative ADD COLUMN law_rich_text TEXT CHECK (law_rich_text IS NULL OR json_valid(law_rich_text));

ALTER TABLE Interpellation ADD COLUMN question_rich_text TEXT CHECK (question_rich_text IS NULL OR json_valid(question_rich_text));

ALTER TABLE Interpellation ADD COLUMN resolution_rich_text TEXT CHECK (resolution_rich_text IS NULL OR json_valid(resolution_rich_text));

ALTER TABLE WrittenQuestion ADD COLUMN question_rich_text TEXT CHECK (question_rich_text IS NULL OR json_valid(question_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN summary_rich_text TEXT CHECK (summary_rich_text IS NULL OR json_valid(summary_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN general_reasoning_rich_text TEXT CHECK (general_reasoning_rich_text IS NULL OR json_valid(general_reasoning_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN detailed_reasoning_rich_text TEXT CHECK (detailed_reasoning_rich_text IS NULL OR json_valid(detailed_reasoning_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN decision_rich_text TEXT CHECK (decision_rich_text IS NULL OR json_valid(decision_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN legislation_amendment_rich_text TEXT CHECK (legislation_amendment_rich_text IS NULL OR json_valid(legislation_amendment_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN minority_opinion_rich_text TEXT CHECK (minority_opinion_rich_text IS NULL OR json_valid(minority_opinion_rich_text));

ALTER TABLE CommitteeReport ADD COLUMN resolution_rich_text TEXT CHECK (resolution_rich_text IS NULL OR json_valid(resolution_rich_text));

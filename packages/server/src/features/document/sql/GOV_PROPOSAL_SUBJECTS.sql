SELECT
  proposal_id,
  subject_text,
  yso_uri
FROM GovernmentProposalSubject
WHERE proposal_id = $proposalId

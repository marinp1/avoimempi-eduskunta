SELECT
  proposal_id,
  law_order,
  law_type,
  law_name
FROM GovernmentProposalLaw
WHERE proposal_id = $proposalId
ORDER BY law_order

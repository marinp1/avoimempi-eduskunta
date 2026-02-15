SELECT
  proposal_id,
  signatory_order,
  first_name,
  last_name,
  title_text
FROM GovernmentProposalSignatory
WHERE proposal_id = $proposalId
ORDER BY signatory_order

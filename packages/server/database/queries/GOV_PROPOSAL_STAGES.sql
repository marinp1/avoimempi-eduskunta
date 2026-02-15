SELECT
  proposal_id,
  stage_order,
  stage_title,
  stage_code,
  event_date,
  event_title,
  event_description
FROM GovernmentProposalStage
WHERE proposal_id = $proposalId
ORDER BY stage_order

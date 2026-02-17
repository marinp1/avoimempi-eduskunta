SELECT
  initiative_id,
  stage_order,
  stage_title,
  stage_code,
  event_date,
  event_title,
  event_description
FROM LegislativeInitiativeStage
WHERE initiative_id = $initiativeId
ORDER BY stage_order ASC

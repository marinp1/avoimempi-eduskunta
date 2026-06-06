SELECT
  interpellation_id,
  stage_order,
  stage_title,
  stage_code,
  event_date,
  event_title,
  event_description
FROM InterpellationStage
WHERE interpellation_id = $interpellationId
ORDER BY stage_order

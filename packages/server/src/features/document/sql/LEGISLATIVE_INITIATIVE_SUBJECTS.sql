SELECT
  initiative_id,
  subject_text,
  yso_uri
FROM LegislativeInitiativeSubject
WHERE initiative_id = $initiativeId
ORDER BY subject_text ASC

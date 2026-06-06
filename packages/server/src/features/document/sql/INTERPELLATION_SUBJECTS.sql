SELECT
  interpellation_id,
  subject_text
FROM InterpellationSubject
WHERE interpellation_id = $interpellationId

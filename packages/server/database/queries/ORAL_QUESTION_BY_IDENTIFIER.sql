SELECT
  oq.id,
  oq.parliament_identifier,
  oq.document_number,
  oq.parliamentary_year,
  oq.title,
  oq.question_text,
  oq.asker_text,
  oq.submission_date,
  oq.decision_outcome,
  oq.decision_outcome_code,
  oq.latest_stage_code,
  oq.end_date
FROM OralQuestion oq
WHERE oq.parliament_identifier = $identifier

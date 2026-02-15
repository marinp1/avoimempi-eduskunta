SELECT
  g.id,
  g.parliament_identifier,
  g.document_number,
  g.parliamentary_year,
  g.title,
  g.submission_date,
  g.author,
  g.decision_outcome,
  g.decision_outcome_code,
  g.latest_stage_code,
  g.end_date
FROM GovernmentProposal g
WHERE g.parliament_identifier = $identifier

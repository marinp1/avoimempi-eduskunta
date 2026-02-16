SELECT
  id,
  parliament_identifier,
  report_type_code,
  document_number,
  parliamentary_year,
  title,
  committee_name,
  source_reference,
  draft_date,
  signature_date,
  summary_text,
  general_reasoning_text,
  detailed_reasoning_text,
  decision_text,
  legislation_amendment_text,
  minority_opinion_text,
  resolution_text
FROM CommitteeReport
WHERE id = $id

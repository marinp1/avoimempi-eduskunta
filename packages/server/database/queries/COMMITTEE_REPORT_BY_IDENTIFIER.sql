SELECT
  id,
  parliament_identifier,
  report_type_code,
  document_number,
  parliamentary_year,
  title,
  committee_name,
  recipient_committee,
  source_reference,
  draft_date,
  signature_date,
  summary_text,
  decision_text,
  resolution_text,
  legislation_amendment_text
FROM CommitteeReport
WHERE parliament_identifier = $identifier

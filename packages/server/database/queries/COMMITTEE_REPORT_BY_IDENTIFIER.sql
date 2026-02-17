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
  summary_rich_text,
  decision_text,
  decision_rich_text,
  resolution_text,
  resolution_rich_text,
  legislation_amendment_text,
  legislation_amendment_rich_text
FROM CommitteeReport
WHERE parliament_identifier = $identifier

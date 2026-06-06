SELECT
  id,
  parliament_identifier,
  document_number,
  parliamentary_year,
  title,
  source_reference,
  committee_report_reference,
  submission_date,
  signature_date,
  language,
  edk_identifier,
  decision_text,
  decision_rich_text,
  legislation_text,
  legislation_rich_text,
  signatory_count
FROM ParliamentAnswer
WHERE id = $id

SELECT
  id,
  parliament_identifier,
  decision_text
FROM CommitteeReport
WHERE source_reference = $sourceReference
  AND report_type_code LIKE '%VM'

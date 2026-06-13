SELECT
  cr.id AS report_id,
  cr.parliament_identifier,
  d.dissent_order,
  d.dissent_number,
  d.heading,
  s.statement_order,
  s.statement_number,
  s.statement_text
FROM CommitteeReport cr
JOIN CommitteeReportDissent d ON d.report_id = cr.id
LEFT JOIN CommitteeReportDissentStatement s
  ON s.report_id = d.report_id AND s.dissent_order = d.dissent_order
WHERE cr.source_reference = $sourceReference
  AND cr.report_type_code LIKE '%VM'
ORDER BY d.dissent_order, s.statement_order

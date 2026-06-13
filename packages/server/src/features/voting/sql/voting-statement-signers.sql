SELECT
  g.report_id,
  g.dissent_order,
  g.signer_order,
  g.first_name,
  g.last_name
FROM CommitteeReport cr
JOIN CommitteeReportDissentSigner g ON g.report_id = cr.id
WHERE cr.source_reference = $sourceReference
  AND cr.report_type_code LIKE '%VM'
ORDER BY g.dissent_order, g.signer_order

SELECT
  report_id,
  expert_order,
  person_id,
  first_name,
  last_name,
  title,
  organization
FROM CommitteeReportExpert
WHERE report_id = $reportId
ORDER BY expert_order

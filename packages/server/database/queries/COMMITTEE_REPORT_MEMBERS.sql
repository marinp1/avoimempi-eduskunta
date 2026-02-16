SELECT
  report_id,
  member_order,
  person_id,
  first_name,
  last_name,
  party,
  role
FROM CommitteeReportMember
WHERE report_id = $reportId
ORDER BY member_order

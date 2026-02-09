SELECT
  cm.id,
  cm.committee_code,
  c.name AS committee_name,
  cm.role,
  cm.start_date,
  cm.end_date
FROM CommitteeMembership cm
JOIN Committee c ON cm.committee_code = c.code
WHERE cm.person_id = $personId
ORDER BY cm.start_date DESC;

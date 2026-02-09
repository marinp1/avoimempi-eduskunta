SELECT
  c.code AS committee_code,
  c.name AS committee_name,
  COUNT(DISTINCT CASE WHEN cm.end_date IS NULL OR cm.end_date >= DATE('now') THEN cm.person_id END) AS current_members,
  COUNT(DISTINCT cm.person_id) AS total_historical_members,
  GROUP_CONCAT(
    DISTINCT CASE
      WHEN (cm.end_date IS NULL OR cm.end_date >= DATE('now'))
        AND cm.role LIKE '%puheenjohtaja%'
      THEN r.first_name || ' ' || r.last_name
    END
  ) AS current_chairs
FROM Committee c
LEFT JOIN CommitteeMembership cm ON c.code = cm.committee_code
LEFT JOIN Representative r ON cm.person_id = r.person_id
GROUP BY c.code, c.name
ORDER BY current_members DESC;

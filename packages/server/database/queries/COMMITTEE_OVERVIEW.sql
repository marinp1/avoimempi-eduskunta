WITH current_chairs AS (
  SELECT
    cm.committee_code,
    r.first_name || ' ' || r.last_name AS chair_name
  FROM CommitteeMembership cm
  JOIN Representative r ON cm.person_id = r.person_id
  WHERE (cm.end_date IS NULL OR cm.end_date >= DATE('now'))
    AND cm.role LIKE '%puheenjohtaja%'
  ORDER BY r.last_name ASC, r.first_name ASC
),
chair_agg AS (
  SELECT
    committee_code,
    GROUP_CONCAT(chair_name, ', ') AS current_chairs
  FROM current_chairs
  GROUP BY committee_code
)
SELECT
  c.code AS committee_code,
  c.name AS committee_name,
  COUNT(DISTINCT CASE WHEN cm.end_date IS NULL OR cm.end_date >= DATE('now') THEN cm.person_id END) AS current_members,
  COUNT(DISTINCT cm.person_id) AS total_historical_members,
  ca.current_chairs
FROM Committee c
LEFT JOIN CommitteeMembership cm ON c.code = cm.committee_code
LEFT JOIN chair_agg ca ON ca.committee_code = c.code
GROUP BY c.code, c.name, ca.current_chairs
ORDER BY current_members DESC;

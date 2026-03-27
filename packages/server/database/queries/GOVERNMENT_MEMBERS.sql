SELECT
  gm.id,
  gm.person_id,
  gm.name,
  gm.ministry,
  gm.start_date,
  gm.end_date,
  r.first_name,
  r.last_name,
  COALESCE(pgm.group_name, r.party) AS party,
  r.gender
FROM GovernmentMembership gm
LEFT JOIN Representative r ON gm.person_id = r.person_id
LEFT JOIN ParliamentaryGroupMembership pgm
  ON pgm.person_id = gm.person_id
  AND pgm.start_date <= COALESCE(gm.end_date, date('now'))
  AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
WHERE gm.government_id = $id
GROUP BY gm.id
ORDER BY gm.ministry, gm.name

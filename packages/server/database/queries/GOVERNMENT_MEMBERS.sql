SELECT
  gm.id,
  gm.person_id,
  gm.name,
  gm.ministry,
  gm.start_date,
  gm.end_date,
  r.first_name,
  r.last_name,
  r.party,
  r.gender
FROM GovernmentMembership gm
LEFT JOIN Representative r ON gm.person_id = r.person_id
WHERE gm.government_id = $id
ORDER BY gm.ministry, gm.name

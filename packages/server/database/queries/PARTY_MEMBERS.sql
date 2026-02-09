SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  r.gender,
  r.birth_date,
  r.current_municipality,
  r.profession,
  COALESCE(gm_current.is_minister, 0) AS is_minister,
  gm_current.ministry
FROM Representative r
JOIN ParliamentaryGroupMembership pgm
  ON r.person_id = pgm.person_id
  AND pgm.group_code = $partyCode
  AND pgm.end_date IS NULL
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
LEFT JOIN (
  SELECT
    person_id,
    1 AS is_minister,
    ministry
  FROM GovernmentMembership
  WHERE end_date IS NULL
) gm_current ON r.person_id = gm_current.person_id
ORDER BY r.last_name, r.first_name;

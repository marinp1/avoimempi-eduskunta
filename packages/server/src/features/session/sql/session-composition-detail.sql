SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  'join' AS change_type,
  pjp.description,
  pjp.replacement_person
FROM Term t
JOIN Representative r ON r.person_id = t.person_id
LEFT JOIN PeopleJoiningParliament pjp ON pjp.person_id = t.person_id
  AND pjp.start_date = t.start_date
WHERE t.start_date = $date

UNION ALL

SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  'leave' AS change_type,
  plp.description,
  plp.replacement_person
FROM Term t
JOIN Representative r ON r.person_id = t.person_id
LEFT JOIN PeopleLeavingParliament plp ON plp.person_id = t.person_id
  AND plp.end_date = t.end_date
WHERE t.end_date = $date

ORDER BY change_type, last_name

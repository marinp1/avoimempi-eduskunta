SELECT t.*
FROM Representative r
JOIN Term t ON r.person_id = t.person_id
WHERE r.person_id = $personId
ORDER BY t.start_date ASC;

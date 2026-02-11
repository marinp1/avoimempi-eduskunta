SELECT pgm.*
FROM Representative r
JOIN ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id
WHERE r.person_id = $personId
ORDER BY start_date ASC;

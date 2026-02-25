SELECT
    gm.person_id,
    gm.ministry,
    gm.name,
    g.name AS government,
    gm.government_id,
    gm.start_date,
    gm.end_date
FROM
    GovernmentMembership gm
JOIN
    Government g ON g.id = gm.government_id
WHERE
    gm.person_id = $personId
ORDER BY gm.start_date DESC

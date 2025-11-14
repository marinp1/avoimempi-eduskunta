SELECT
    gm.*
FROM
    GovernmentMembership gm
WHERE
    gm.person_id = $personId
ORDER BY gm.start_date DESC

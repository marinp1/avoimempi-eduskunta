SELECT
    r.*
FROM
    Representative r
WHERE
    r.person_id = $personId

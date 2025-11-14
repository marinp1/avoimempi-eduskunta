SELECT
    plp.*
FROM
    PeopleLeavingParliament plp
WHERE
    plp.person_id = $personId
ORDER BY plp.end_date DESC

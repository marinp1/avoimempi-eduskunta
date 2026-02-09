SELECT
    vs.*,
    v.vote,
    v.group_abbreviation
FROM
    Voting vs
JOIN
    Vote v ON vs.id = v.voting_id
JOIN
    Representative r on r.person_id = v.person_id
WHERE
    r.person_id = $personId
ORDER BY vs.start_time DESC

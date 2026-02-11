SELECT
    vs.*,
    v.vote,
    v.group_abbreviation
FROM
    Voting vs
JOIN
    Vote v ON vs.id = v.voting_id
WHERE
    v.person_id = $personId
ORDER BY vs.start_time DESC

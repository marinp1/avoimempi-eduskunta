SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(
        CAST(COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS REAL) * 100.0 /
        NULLIF(COUNT(*), 0),
        2
    ) AS participation_rate
FROM
    Representative r
JOIN
    Vote v ON r.person_id = v.person_id
JOIN
    Voting vt ON vt.id = v.voting_id
WHERE
    ($startDate IS NULL OR vt.start_date >= $startDate)
    AND ($endDateExclusive IS NULL OR vt.start_date < $endDateExclusive)
GROUP BY
    r.person_id
HAVING
    COUNT(*) > 0
ORDER BY
    participation_rate DESC, votes_cast DESC

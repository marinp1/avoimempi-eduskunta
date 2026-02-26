WITH participation_stats AS (
    SELECT
        pvds.person_id,
        SUM(pvds.votes_cast) AS votes_cast,
        SUM(pvds.total_votings) AS total_votings,
        ROUND(
            CAST(SUM(pvds.votes_cast) AS REAL) * 100.0 /
            NULLIF(SUM(pvds.total_votings), 0),
            2
        ) AS participation_rate
    FROM PersonVotingDailyStats pvds
    WHERE
        ($startDate IS NULL OR pvds.voting_date >= $startDate)
        AND ($endDateExclusive IS NULL OR pvds.voting_date < $endDateExclusive)
    GROUP BY pvds.person_id
    HAVING SUM(pvds.total_votings) > 0
)
SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    ps.votes_cast,
    ps.total_votings,
    ps.participation_rate
FROM participation_stats ps
JOIN Representative r ON r.person_id = ps.person_id
ORDER BY
    ps.participation_rate DESC, ps.votes_cast DESC

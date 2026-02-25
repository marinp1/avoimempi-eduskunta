WITH GovernmentPeriods AS (
    SELECT
        g.id AS government_id,
        g.name AS government,
        g.start_date AS government_start,
        g.end_date AS government_end
    FROM Government g
),
GovernmentCoalitionParties AS (
    SELECT
        gm.government_id,
        pgm.group_name
    FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
        AND pgm.start_date <= g.start_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= g.start_date)
    GROUP BY gm.government_id, pgm.group_name
)
SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    gp.government,
    gp.government_start,
    gp.government_end,
    COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(
        CAST(COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS REAL) * 100.0 /
        NULLIF(COUNT(*), 0),
        2
    ) AS participation_rate,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM GovernmentMembership gm2
            WHERE gm2.person_id = r.person_id
                AND gm2.government_id = gp.government_id
        ) THEN 1
        ELSE 0
    END AS was_in_government,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM ParliamentaryGroupMembership pgm2
            JOIN GovernmentCoalitionParties gcp ON pgm2.group_name = gcp.group_name AND gcp.government_id = gp.government_id
            WHERE pgm2.person_id = r.person_id
                AND pgm2.start_date <= gp.government_start
                AND (pgm2.end_date IS NULL OR pgm2.end_date >= gp.government_start)
        ) THEN 1
        ELSE 0
    END AS was_in_coalition
FROM
    Representative r
JOIN
    GovernmentPeriods gp
JOIN
    Vote v ON r.person_id = v.person_id
JOIN
    Voting vt ON vt.id = v.voting_id
    AND vt.start_date >= gp.government_start
    AND (gp.government_end IS NULL OR vt.start_date <= gp.government_end)
    AND ($startDate IS NULL OR vt.start_date >= $startDate)
    AND ($endDateExclusive IS NULL OR vt.start_date < $endDateExclusive)
WHERE
    r.person_id = $personId
GROUP BY
    r.person_id, gp.government_id
HAVING
    COUNT(*) > 0
ORDER BY
    gp.government_start DESC

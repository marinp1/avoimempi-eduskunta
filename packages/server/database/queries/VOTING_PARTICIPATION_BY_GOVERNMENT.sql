WITH GovernmentPeriods AS (
    SELECT DISTINCT
        government,
        MIN(start_date) AS government_start,
        MAX(CASE WHEN end_date = '' THEN NULL ELSE end_date END) AS government_end
    FROM GovernmentMembership
    GROUP BY government
),
GovernmentCoalitionParties AS (
    SELECT
        gm.government,
        pgm.group_name
    FROM GovernmentMembership gm
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
        AND pgm.start_date <= gm.start_date
        AND (pgm.end_date = '' OR pgm.end_date >= gm.start_date)
    GROUP BY gm.government, pgm.group_name
)
SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    gp.government,
    gp.government_start,
    gp.government_end,
    COUNT(CASE WHEN TRIM(v.vote) != 'Poissa' THEN 1 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(
        CAST(COUNT(CASE WHEN TRIM(v.vote) != 'Poissa' THEN 1 END) AS REAL) * 100.0 /
        NULLIF(COUNT(*), 0),
        2
    ) AS participation_rate,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM GovernmentMembership gm2
            WHERE gm2.person_id = r.person_id
                AND gm2.government = gp.government
        ) THEN 1
        ELSE 0
    END AS was_in_government,
    CASE
        WHEN EXISTS (
            SELECT 1
            FROM ParliamentaryGroupMembership pgm2
            JOIN GovernmentCoalitionParties gcp ON pgm2.group_name = gcp.group_name AND gcp.government = gp.government
            WHERE pgm2.person_id = r.person_id
                AND pgm2.start_date <= gp.government_start
                AND (pgm2.end_date = '' OR pgm2.end_date >= gp.government_start)
        ) THEN 1
        ELSE 0
    END AS was_in_coalition
FROM
    Representative r
CROSS JOIN
    GovernmentPeriods gp
JOIN
    Vote v ON r.person_id = v.person_id
JOIN
    Voting vt ON vt.id = v.voting_id
    AND DATE(vt.start_time) >= gp.government_start
    AND (gp.government_end IS NULL OR DATE(vt.start_time) <= gp.government_end)
    AND (CAST($startDate AS TEXT) = '' OR DATE(vt.start_time) >= $startDate)
    AND (CAST($endDate AS TEXT) = '' OR DATE(vt.start_time) <= $endDate)
WHERE
    r.person_id = $personId
    AND (
        (CAST($startDate AS TEXT) = '' AND CAST($endDate AS TEXT) = '')
        OR (gp.government_start <= COALESCE($endDate, DATE('now'))
            AND (gp.government_end IS NULL OR gp.government_end >= COALESCE($startDate, gp.government_start)))
    )
GROUP BY
    r.person_id, gp.government
HAVING
    COUNT(*) > 0
ORDER BY
    gp.government_start DESC
`;

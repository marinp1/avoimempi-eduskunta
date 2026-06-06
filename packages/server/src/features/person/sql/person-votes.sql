WITH PersonGroups AS (
    SELECT group_name, start_date, end_date
    FROM ParliamentaryGroupMembership
    WHERE person_id = $personId
),
GovernmentCoalitionParties AS (
    SELECT gm.government_id, pgm.group_name
    FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
        AND pgm.start_date <= g.start_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= g.start_date)
    GROUP BY gm.government_id, pgm.group_name
),
PersonCoalitionByGovernment AS (
    SELECT DISTINCT gcp.government_id, 1 AS is_coalition
    FROM GovernmentCoalitionParties gcp
    JOIN PersonGroups pg ON pg.group_name = gcp.group_name
)
SELECT
    vs.*,
    v.vote,
    v.group_abbreviation,
    g.name AS government_name,
    g.start_date AS government_start_date,
    g.end_date AS government_end_date,
    COALESCE(pcg.is_coalition, 0) AS is_coalition
FROM Vote v
JOIN Voting vs ON vs.id = v.voting_id
LEFT JOIN Government g
    ON vs.start_date >= g.start_date
   AND (g.end_date IS NULL OR vs.start_date <= g.end_date)
LEFT JOIN PersonCoalitionByGovernment pcg ON pcg.government_id = g.id
WHERE v.person_id = $personId
ORDER BY vs.start_time DESC;

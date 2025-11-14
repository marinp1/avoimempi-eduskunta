WITH GovernmentPeriods AS (
    SELECT DISTINCT
        government,
        MIN(start_date) AS government_start,
        MAX(end_date) AS government_end
    FROM GovernmentMembership
    GROUP BY government
),
-- Pre-compute coalition parties for each government
CoalitionParties AS (
    SELECT DISTINCT
        gm.government,
        pgm.group_name AS party_name
    FROM GovernmentMembership gm
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
    WHERE pgm.start_date <= gm.start_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
),
-- Create a lookup table mapping each voting to its government (one correlated subquery per voting)
VotingGovernment AS (
    SELECT DISTINCT
        vt.id AS voting_id,
        vt.start_time,
        (
            SELECT gp.government
            FROM GovernmentPeriods gp
            WHERE DATE(vt.start_time) >= gp.government_start
                AND (gp.government_end IS NULL OR DATE(vt.start_time) <= gp.government_end)
            ORDER BY gp.government_start DESC
            LIMIT 1
        ) AS government
    FROM Voting vt
    WHERE
        ($startDate IS NULL OR DATE(vt.start_time) >= $startDate)
        AND ($endDate IS NULL OR DATE(vt.start_time) <= $endDate)
),
-- Aggregate votes by government and party
PartyVotingStats AS (
    SELECT
        vg.government,
        pgm.group_name AS party_name,
        COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS votes_cast,
        COUNT(*) AS total_votings,
        ROUND(
            CAST(COUNT(CASE WHEN v.vote != 'Poissa' THEN 1 END) AS REAL) * 100.0 /
            NULLIF(COUNT(*), 0),
            2
        ) AS participation_rate,
        COUNT(DISTINCT v.person_id) AS party_member_count
    FROM VotingGovernment vg
    JOIN Vote v ON vg.voting_id = v.voting_id
    JOIN ParliamentaryGroupMembership pgm ON v.person_id = pgm.person_id
    WHERE
        vg.government IS NOT NULL
        AND pgm.start_date <= DATE(vg.start_time)
        AND (pgm.end_date IS NULL OR pgm.end_date >= DATE(vg.start_time))
    GROUP BY
        vg.government, pgm.group_name
    HAVING
        COUNT(*) >= 10
)
SELECT
    pvs.government,
    gp.government_start,
    gp.government_end,
    pvs.party_name,
    pvs.votes_cast,
    pvs.total_votings,
    pvs.participation_rate,
    pvs.party_member_count,
    COALESCE(cp.party_name IS NOT NULL, 0) AS was_in_coalition
FROM PartyVotingStats pvs
JOIN GovernmentPeriods gp ON pvs.government = gp.government
LEFT JOIN CoalitionParties cp ON
    pvs.government = cp.government
    AND pvs.party_name = cp.party_name
ORDER BY
    gp.government_start DESC, pvs.party_name ASC

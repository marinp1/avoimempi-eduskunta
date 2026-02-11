WITH GovernmentPeriods AS (
    SELECT DISTINCT
        government,
        MIN(start_date) AS government_start,
        MAX(end_date) AS government_end
    FROM GovernmentMembership
    GROUP BY government
),
CoalitionParties AS (
    SELECT
        gm.government,
        LOWER(RTRIM(pgm.group_code, '0123456789')) AS party
    FROM GovernmentMembership gm
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
    WHERE pgm.start_date <= gm.start_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= gm.start_date)
    GROUP BY gm.government, LOWER(RTRIM(pgm.group_code, '0123456789'))
),
GroupMap AS (
    SELECT
        ranked.party,
        ranked.group_name
    FROM (
        SELECT
            LOWER(RTRIM(pgm.group_code, '0123456789')) AS party,
            pgm.group_name,
            ROW_NUMBER() OVER (
                PARTITION BY LOWER(RTRIM(pgm.group_code, '0123456789'))
                ORDER BY
                    CASE WHEN pgm.end_date IS NULL THEN 0 ELSE 1 END,
                    pgm.end_date DESC,
                    pgm.start_date DESC,
                    pgm.id DESC
            ) AS rn
        FROM ParliamentaryGroupMembership pgm
    ) ranked
    WHERE ranked.rn = 1
),
VotingBase AS (
    SELECT
        vt.id AS voting_id,
        SUBSTR(vt.start_time, 1, 10) AS voting_date
    FROM Voting vt
    WHERE
        ($startDate IS NULL OR SUBSTR(vt.start_time, 1, 10) >= $startDate)
        AND ($endDate IS NULL OR SUBSTR(vt.start_time, 1, 10) <= $endDate)
),
VotingDates AS (
    SELECT DISTINCT voting_date
    FROM VotingBase
),
DateGovernment AS (
    SELECT
        ranked.voting_date,
        ranked.government
    FROM (
        SELECT
            vd.voting_date,
            gp.government,
            ROW_NUMBER() OVER (
                PARTITION BY vd.voting_date
                ORDER BY gp.government_start DESC
            ) AS rn
        FROM VotingDates vd
        JOIN GovernmentPeriods gp
            ON vd.voting_date >= gp.government_start
            AND (gp.government_end IS NULL OR vd.voting_date <= gp.government_end)
    ) ranked
    WHERE ranked.rn = 1
),
VotingGovernment AS (
    SELECT
        vb.voting_id,
        vb.voting_date,
        dg.government
    FROM VotingBase vb
    JOIN DateGovernment dg ON dg.voting_date = vb.voting_date
),
VoteAgg AS (
    SELECT
        v.voting_id,
        v.group_abbreviation AS party,
        SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
        COUNT(*) AS total_votings,
        COUNT(DISTINCT v.person_id) AS party_member_count
    FROM Vote v
    WHERE v.group_abbreviation IS NOT NULL
    GROUP BY v.voting_id, v.group_abbreviation
),
PartyVotingStats AS (
    SELECT
        vg.government,
        va.party,
        SUM(va.votes_cast) AS votes_cast,
        SUM(va.total_votings) AS total_votings,
        ROUND(
            CAST(SUM(va.votes_cast) AS REAL) * 100.0 /
            NULLIF(SUM(va.total_votings), 0),
            2
        ) AS participation_rate,
        MAX(va.party_member_count) AS party_member_count
    FROM VotingGovernment vg
    JOIN VoteAgg va ON vg.voting_id = va.voting_id
    WHERE
        vg.government IS NOT NULL
    GROUP BY
        vg.government,
        va.party
    HAVING
        SUM(va.total_votings) >= 10
)
SELECT
    pvs.government,
    gp.government_start,
    gp.government_end,
    COALESCE(gm.group_name, pvs.party) AS party_name,
    pvs.votes_cast,
    pvs.total_votings,
    pvs.participation_rate,
    pvs.party_member_count,
    COALESCE(cp.party IS NOT NULL, 0) AS was_in_coalition
FROM PartyVotingStats pvs
JOIN GovernmentPeriods gp ON pvs.government = gp.government
LEFT JOIN GroupMap gm ON gm.party = pvs.party
LEFT JOIN CoalitionParties cp ON
    pvs.government = cp.government
    AND pvs.party = cp.party
ORDER BY
    gp.government_start DESC, COALESCE(gm.group_name, pvs.party) ASC

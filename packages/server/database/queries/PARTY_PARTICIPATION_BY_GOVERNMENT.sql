WITH GovernmentPeriods AS (
    SELECT
        g.id AS government_id,
        g.name AS government,
        g.start_date AS government_start,
        g.end_date AS government_end
    FROM Government g
),
CoalitionParties AS (
    SELECT
        gm.government_id,
        pgm.group_abbreviation AS party
    FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
    WHERE pgm.start_date <= g.start_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= g.start_date)
    GROUP BY gm.government_id, pgm.group_abbreviation
),
RankedGroupMap AS (
    SELECT
        pgm.group_abbreviation AS party,
        pgm.group_name,
        ROW_NUMBER() OVER (
            PARTITION BY pgm.group_abbreviation
            ORDER BY
                CASE WHEN pgm.end_date IS NULL THEN 0 ELSE 1 END,
                pgm.end_date DESC,
                pgm.start_date DESC,
                pgm.id DESC
        ) AS row_num
    FROM ParliamentaryGroupMembership pgm
    WHERE pgm.group_abbreviation IS NOT NULL
),
GroupMap AS (
    SELECT
        party,
        group_name
    FROM RankedGroupMap
    WHERE row_num = 1
),
VotePerVotingParty AS (
    SELECT
        g.id AS government_id,
        vps.voting_id,
        vps.party,
        vps.votes_cast,
        vps.total_votings,
        vps.party_member_count
    FROM Voting vt
    JOIN Government g
        ON g.start_date <= vt.start_date
        AND (g.end_date IS NULL OR g.end_date >= vt.start_date)
    JOIN VotingPartyStats vps ON vps.voting_id = vt.id
    WHERE
        ($startDate IS NULL OR vt.start_date >= $startDate)
        AND ($endDateExclusive IS NULL OR vt.start_date < $endDateExclusive)
),
PartyVotingStats AS (
    SELECT
        vpp.government_id,
        vpp.party,
        SUM(vpp.votes_cast) AS votes_cast,
        SUM(vpp.total_votings) AS total_votings,
        ROUND(
            CAST(SUM(vpp.votes_cast) AS REAL) * 100.0 /
            NULLIF(SUM(vpp.total_votings), 0),
            2
        ) AS participation_rate,
        MAX(vpp.party_member_count) AS party_member_count
    FROM VotePerVotingParty vpp
    GROUP BY
        vpp.government_id,
        vpp.party
    HAVING
        SUM(vpp.total_votings) >= 10
)
SELECT
    gp.government,
    gp.government_start,
    gp.government_end,
    COALESCE(gm.group_name, pvs.party) AS party_name,
    pvs.votes_cast,
    pvs.total_votings,
    pvs.participation_rate,
    pvs.party_member_count,
    COALESCE(cp.party IS NOT NULL, 0) AS was_in_coalition
FROM PartyVotingStats pvs
JOIN GovernmentPeriods gp ON pvs.government_id = gp.government_id
LEFT JOIN GroupMap gm ON gm.party = pvs.party
LEFT JOIN CoalitionParties cp ON
    pvs.government_id = cp.government_id
    AND pvs.party = cp.party
ORDER BY
    gp.government_start DESC, COALESCE(gm.group_name, pvs.party) ASC

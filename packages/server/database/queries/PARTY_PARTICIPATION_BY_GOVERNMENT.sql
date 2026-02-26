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
GroupMap AS (
    SELECT
        pgm.group_abbreviation AS party,
        pgm.group_name
    FROM ParliamentaryGroupMembership pgm
    WHERE pgm.group_abbreviation IS NOT NULL
        AND pgm.id = (
            SELECT pgm2.id
            FROM ParliamentaryGroupMembership pgm2
            WHERE pgm2.group_abbreviation = pgm.group_abbreviation
            ORDER BY
                CASE WHEN pgm2.end_date IS NULL THEN 0 ELSE 1 END,
                pgm2.end_date DESC,
                pgm2.start_date DESC,
                pgm2.id DESC
            LIMIT 1
        )
),
VotingBase AS (
    SELECT
        vt.id AS voting_id,
        vt.start_date AS voting_date
    FROM Voting vt
    WHERE
        ($startDate IS NULL OR vt.start_date >= $startDate)
        AND ($endDateExclusive IS NULL OR vt.start_date < $endDateExclusive)
),
VotingDates AS (
    SELECT DISTINCT voting_date
    FROM VotingBase
),
DateGovernment AS (
    SELECT
        vd.voting_date,
        (
            SELECT g.id
            FROM Government g
            WHERE g.start_date <= vd.voting_date
                AND (g.end_date IS NULL OR g.end_date >= vd.voting_date)
            ORDER BY g.start_date DESC
            LIMIT 1
        ) AS government_id
    FROM VotingDates vd
),
VotingGovernment AS (
    SELECT
        vb.voting_id,
        vb.voting_date,
        dg.government_id
    FROM VotingBase vb
    JOIN DateGovernment dg ON dg.voting_date = vb.voting_date
),
VotePerVotingParty AS (
    SELECT
        vg.government_id,
        v.voting_id,
        v.group_abbreviation AS party,
        SUM(CASE WHEN v.vote != 'Poissa' THEN 1 ELSE 0 END) AS votes_cast,
        COUNT(*) AS total_votings,
        COUNT(DISTINCT v.person_id) AS party_member_count
    FROM VotingGovernment vg
    JOIN Vote v INDEXED BY idx_vote_voting_group_vote ON v.voting_id = vg.voting_id
    WHERE
        vg.government_id IS NOT NULL
        AND v.group_abbreviation IS NOT NULL
    GROUP BY vg.government_id, v.voting_id, v.group_abbreviation
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

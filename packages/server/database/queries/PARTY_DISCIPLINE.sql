WITH filtered_votings AS (
  SELECT id
  FROM Voting INDEXED BY idx_voting_start_date
  WHERE ($startDate IS NULL OR start_date >= $startDate)
    AND ($endDateExclusive IS NULL OR start_date < $endDateExclusive)
),
party_vote_counts AS (
  SELECT
    vps.voting_id,
    vps.party,
    vps.n_jaa,
    vps.n_ei,
    vps.n_tyhjaa
  FROM filtered_votings fv
  CROSS JOIN VotingPartyStats vps
  WHERE vps.voting_id = fv.id
    AND vps.party IS NOT NULL
),
discipline_stats AS (
  SELECT
    party,
    SUM(n_jaa + n_ei + n_tyhjaa) AS total_votes,
    SUM(
      CASE
        WHEN n_jaa >= n_ei AND n_jaa >= n_tyhjaa THEN n_jaa
        WHEN n_ei >= n_jaa AND n_ei >= n_tyhjaa THEN n_ei
        ELSE n_tyhjaa
      END
    ) AS votes_with_majority
  FROM party_vote_counts
  WHERE (n_jaa + n_ei + n_tyhjaa) >= 2
  GROUP BY party
),
group_map AS (
  SELECT
    pgm.group_abbreviation AS party,
    MAX(pgm.group_name) AS group_name
  FROM ParliamentaryGroupMembership pgm
  WHERE pgm.end_date IS NULL
  GROUP BY pgm.group_abbreviation
)
SELECT
  gm.group_name AS party_name,
  ds.party AS party_code,
  ds.total_votes,
  ds.votes_with_majority,
  ROUND(100.0 * ds.votes_with_majority / ds.total_votes, 1) AS discipline_rate
FROM discipline_stats ds
LEFT JOIN group_map gm ON gm.party = ds.party
WHERE ds.total_votes > 100
ORDER BY discipline_rate DESC;

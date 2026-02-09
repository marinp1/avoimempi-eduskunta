WITH party_vote_counts AS (
  SELECT
    v.voting_id,
    v.group_abbreviation AS party,
    SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) AS n_jaa,
    SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) AS n_ei,
    SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END) AS n_tyhjaa
  FROM Vote v
  WHERE v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  GROUP BY v.voting_id, v.group_abbreviation
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
)
SELECT
  pgm.group_name AS party_name,
  ds.party AS party_code,
  ds.total_votes,
  ds.votes_with_majority,
  ROUND(100.0 * ds.votes_with_majority / ds.total_votes, 1) AS discipline_rate
FROM discipline_stats ds
LEFT JOIN (
  SELECT DISTINCT group_code, group_name
  FROM ParliamentaryGroupMembership
) pgm ON pgm.group_code LIKE ds.party || '%'
WHERE ds.total_votes > 100
ORDER BY discipline_rate DESC;

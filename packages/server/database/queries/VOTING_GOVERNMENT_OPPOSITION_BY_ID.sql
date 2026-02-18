WITH voting_context AS (
  SELECT start_date AS voting_date
  FROM Voting
  WHERE id = $id
),
classified_votes AS (
  SELECT
    v.vote AS vote_value,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM GovernmentMembership gm
        JOIN voting_context vc
        WHERE gm.person_id = v.person_id
          AND gm.start_date <= vc.voting_date
          AND (gm.end_date IS NULL OR gm.end_date >= vc.voting_date)
      ) THEN 1
      ELSE 0
    END AS is_government
  FROM Vote v
  WHERE v.voting_id = $id
)
SELECT
  SUM(CASE WHEN is_government = 1 AND vote_value = 'Jaa' THEN 1 ELSE 0 END) AS government_yes,
  SUM(CASE WHEN is_government = 1 AND vote_value = 'Ei' THEN 1 ELSE 0 END) AS government_no,
  SUM(CASE WHEN is_government = 1 AND vote_value = ('Tyhj' || char(228, 228)) THEN 1 ELSE 0 END) AS government_abstain,
  SUM(CASE WHEN is_government = 1 AND vote_value = 'Poissa' THEN 1 ELSE 0 END) AS government_absent,
  SUM(CASE WHEN is_government = 1 THEN 1 ELSE 0 END) AS government_total,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'Jaa' THEN 1 ELSE 0 END) AS opposition_yes,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'Ei' THEN 1 ELSE 0 END) AS opposition_no,
  SUM(CASE WHEN is_government = 0 AND vote_value = ('Tyhj' || char(228, 228)) THEN 1 ELSE 0 END) AS opposition_abstain,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'Poissa' THEN 1 ELSE 0 END) AS opposition_absent,
  SUM(CASE WHEN is_government = 0 THEN 1 ELSE 0 END) AS opposition_total
FROM classified_votes

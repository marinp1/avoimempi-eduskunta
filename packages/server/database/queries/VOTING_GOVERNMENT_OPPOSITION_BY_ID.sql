WITH voting_context AS (
  SELECT DATE(start_time) AS voting_date
  FROM Voting
  WHERE id = $id
),
classified_votes AS (
  SELECT
    LOWER(TRIM(v.vote)) AS vote_value,
    CASE
      WHEN EXISTS (
        SELECT 1
        FROM GovernmentMembership gm
        JOIN voting_context vc
        WHERE gm.person_id = v.person_id
          AND DATE(gm.start_date) <= vc.voting_date
          AND (gm.end_date IS NULL OR DATE(gm.end_date) >= vc.voting_date)
      ) THEN 1
      ELSE 0
    END AS is_government
  FROM Vote v
  WHERE v.voting_id = $id
)
SELECT
  SUM(CASE WHEN is_government = 1 AND vote_value = 'jaa' THEN 1 ELSE 0 END) AS government_yes,
  SUM(CASE WHEN is_government = 1 AND vote_value = 'ei' THEN 1 ELSE 0 END) AS government_no,
  SUM(CASE WHEN is_government = 1 AND vote_value = 'tyhjää' THEN 1 ELSE 0 END) AS government_abstain,
  SUM(CASE WHEN is_government = 1 AND vote_value = 'poissa' THEN 1 ELSE 0 END) AS government_absent,
  SUM(CASE WHEN is_government = 1 THEN 1 ELSE 0 END) AS government_total,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'jaa' THEN 1 ELSE 0 END) AS opposition_yes,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'ei' THEN 1 ELSE 0 END) AS opposition_no,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'tyhjää' THEN 1 ELSE 0 END) AS opposition_abstain,
  SUM(CASE WHEN is_government = 0 AND vote_value = 'poissa' THEN 1 ELSE 0 END) AS opposition_absent,
  SUM(CASE WHEN is_government = 0 THEN 1 ELSE 0 END) AS opposition_total
FROM classified_votes

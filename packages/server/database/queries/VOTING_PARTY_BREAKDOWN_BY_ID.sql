WITH voting_context AS (
  SELECT DATE(start_time) AS voting_date
  FROM Voting
  WHERE id = $id
),
party_rows AS (
  SELECT
    COALESCE(NULLIF(TRIM(v.group_abbreviation), ''), '(tuntematon)') AS party_code,
    LOWER(TRIM(v.vote)) AS vote_value
  FROM Vote v
  WHERE v.voting_id = $id
)
SELECT
  pr.party_code,
  COALESCE(
    (
      SELECT NULLIF(TRIM(pgm.group_name), '')
      FROM ParliamentaryGroupMembership pgm
      JOIN voting_context vc
      WHERE pgm.group_abbreviation = pr.party_code
        AND DATE(pgm.start_date) <= vc.voting_date
        AND (pgm.end_date IS NULL OR DATE(pgm.end_date) >= vc.voting_date)
      ORDER BY DATE(pgm.start_date) DESC
      LIMIT 1
    ),
    UPPER(pr.party_code)
  ) AS party_name,
  SUM(CASE WHEN pr.vote_value = 'jaa' THEN 1 ELSE 0 END) AS n_yes,
  SUM(CASE WHEN pr.vote_value = 'ei' THEN 1 ELSE 0 END) AS n_no,
  SUM(CASE WHEN pr.vote_value = 'tyhjää' THEN 1 ELSE 0 END) AS n_abstain,
  SUM(CASE WHEN pr.vote_value = 'poissa' THEN 1 ELSE 0 END) AS n_absent,
  COUNT(*) AS n_total
FROM party_rows pr
GROUP BY pr.party_code
ORDER BY n_total DESC, pr.party_code ASC

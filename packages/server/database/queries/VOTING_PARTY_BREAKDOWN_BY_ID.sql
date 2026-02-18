WITH voting_context AS (
  SELECT start_date AS voting_date
  FROM Voting
  WHERE id = $id
),
party_rows AS (
  SELECT
    COALESCE(NULLIF(v.group_abbreviation, ''), '(tuntematon)') AS party_code,
    v.vote AS vote_value
  FROM Vote v
  WHERE v.voting_id = $id
)
SELECT
  pr.party_code,
  COALESCE(
    (
      SELECT NULLIF(pgm.group_name, '')
      FROM ParliamentaryGroupMembership pgm
      JOIN voting_context vc
      WHERE pgm.group_abbreviation = pr.party_code
        AND pgm.start_date <= vc.voting_date
        AND (pgm.end_date IS NULL OR pgm.end_date >= vc.voting_date)
      ORDER BY pgm.start_date DESC
      LIMIT 1
    ),
    UPPER(pr.party_code)
  ) AS party_name,
  SUM(CASE WHEN pr.vote_value = 'Jaa' THEN 1 ELSE 0 END) AS n_yes,
  SUM(CASE WHEN pr.vote_value = 'Ei' THEN 1 ELSE 0 END) AS n_no,
  SUM(CASE WHEN pr.vote_value = ('Tyhj' || char(228, 228)) THEN 1 ELSE 0 END) AS n_abstain,
  SUM(CASE WHEN pr.vote_value = 'Poissa' THEN 1 ELSE 0 END) AS n_absent,
  COUNT(*) AS n_total
FROM party_rows pr
GROUP BY pr.party_code
ORDER BY n_total DESC, pr.party_code ASC

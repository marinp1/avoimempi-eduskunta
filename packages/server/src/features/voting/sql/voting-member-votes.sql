WITH voting_context AS (
  SELECT start_date AS voting_date
  FROM Voting
  WHERE id = $id
)
SELECT
  v.person_id,
  COALESCE(NULLIF(r.first_name, ''), '?') AS first_name,
  COALESCE(NULLIF(r.last_name, ''), '?') AS last_name,
  COALESCE(NULLIF(v.group_abbreviation, ''), r.party, '(tuntematon)') AS party_code,
  v.vote AS vote,
  CASE
    WHEN EXISTS (
      SELECT 1
      FROM GovernmentMembership gm
      JOIN Government g ON g.id = gm.government_id
      JOIN voting_context vc
      WHERE gm.person_id = v.person_id
        AND g.start_date <= vc.voting_date
        AND (g.end_date IS NULL OR g.end_date >= vc.voting_date)
        AND gm.start_date <= vc.voting_date
        AND (gm.end_date IS NULL OR gm.end_date >= vc.voting_date)
    ) THEN 1
    ELSE 0
  END AS is_government
FROM Vote v
LEFT JOIN Representative r ON r.person_id = v.person_id
WHERE v.voting_id = $id
ORDER BY party_code ASC, last_name ASC, first_name ASC

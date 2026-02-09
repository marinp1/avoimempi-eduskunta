WITH person_votings AS (
  SELECT DISTINCT v.voting_id
  FROM Vote v
  WHERE v.person_id = $personId
    AND v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  ORDER BY v.voting_id DESC
  LIMIT 2000
),
party_majority AS (
  SELECT
    v.voting_id,
    TRIM(v.group_abbrviation) AS party,
    CASE
      WHEN SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END)
        AND SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END)
      THEN 'Jaa'
      WHEN SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Jaa' THEN 1 ELSE 0 END)
        AND SUM(CASE WHEN v.vote = 'Ei' THEN 1 ELSE 0 END) >= SUM(CASE WHEN v.vote = 'Tyhjää' THEN 1 ELSE 0 END)
      THEN 'Ei'
      ELSE 'Tyhjää'
    END AS majority_vote
  FROM Vote v
  JOIN person_votings pv ON v.voting_id = pv.voting_id
  WHERE v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  GROUP BY v.voting_id, TRIM(v.group_abbrviation)
)
SELECT
  vt.id AS voting_id,
  vt.start_time,
  vt.title,
  vt.section_title,
  v.vote AS mp_vote,
  pm.majority_vote,
  pgm.group_name AS party_name
FROM Vote v
JOIN Voting vt ON v.voting_id = vt.id
JOIN party_majority pm ON v.voting_id = pm.voting_id AND TRIM(v.group_abbrviation) = pm.party
LEFT JOIN ParliamentaryGroupMembership pgm
  ON v.person_id = pgm.person_id
  AND pgm.group_code LIKE pm.party || '%'
  AND DATE(vt.start_time) >= pgm.start_date
  AND (pgm.end_date IS NULL OR DATE(vt.start_time) <= pgm.end_date)
WHERE v.person_id = $personId
  AND v.vote IN ('Jaa', 'Ei', 'Tyhjää')
  AND v.vote != pm.majority_vote
ORDER BY vt.start_time DESC
LIMIT $limit;

WITH recent_votings AS (
  SELECT id, start_time, title, section_title, n_yes, n_no
  FROM Voting
  WHERE annulled = 0
  ORDER BY start_time DESC
  LIMIT $limit
)
SELECT
  vt.id AS voting_id,
  vt.start_time,
  vt.title,
  vt.section_title,
  vt.n_yes,
  vt.n_no,
  SUM(CASE WHEN gm.id IS NOT NULL AND v.vote = 'Jaa' THEN 1 ELSE 0 END) AS coalition_yes,
  SUM(CASE WHEN gm.id IS NOT NULL AND v.vote = 'Ei' THEN 1 ELSE 0 END) AS coalition_no,
  SUM(CASE WHEN gm.id IS NOT NULL AND v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) AS coalition_total,
  SUM(CASE WHEN gm.id IS NULL AND v.vote = 'Jaa' THEN 1 ELSE 0 END) AS opposition_yes,
  SUM(CASE WHEN gm.id IS NULL AND v.vote = 'Ei' THEN 1 ELSE 0 END) AS opposition_no,
  SUM(CASE WHEN gm.id IS NULL AND v.vote IN ('Jaa', 'Ei', 'Tyhjää') THEN 1 ELSE 0 END) AS opposition_total
FROM recent_votings vt
JOIN Vote v ON vt.id = v.voting_id
LEFT JOIN GovernmentMembership gm
  ON v.person_id = gm.person_id
  AND SUBSTR(vt.start_time, 1, 10) >= gm.start_date
  AND (gm.end_date IS NULL OR SUBSTR(vt.start_time, 1, 10) <= gm.end_date)
WHERE v.vote IN ('Jaa', 'Ei', 'Tyhjää')
GROUP BY vt.id, vt.start_time, vt.title, vt.section_title, vt.n_yes, vt.n_no
ORDER BY vt.start_time DESC;

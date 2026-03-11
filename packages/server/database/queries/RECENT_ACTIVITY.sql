SELECT
  s.date,
  s.key AS session_key,
  s.description,
  s.type AS session_type,
  COUNT(DISTINCT sec.key) AS section_count,
  COUNT(DISTINCT vt.id) AS voting_count,
  SUM(vt.n_total) AS total_votes_cast,
  COUNT(DISTINCT CASE WHEN ABS(vt.n_yes - vt.n_no) <= 10 THEN vt.id END) AS close_vote_count
FROM Session s
LEFT JOIN Section sec ON s.key = sec.session_key
LEFT JOIN Voting vt ON sec.key = vt.section_key AND vt.annulled = 0
WHERE ($startDate IS NULL OR s.date >= $startDate)
  AND ($endDateExclusive IS NULL OR s.date < $endDateExclusive)
GROUP BY s.date, s.key, s.description, s.type
ORDER BY s.date DESC
LIMIT $limit;

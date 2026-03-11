SELECT
  v.session_key AS value,
  COUNT(*) AS count
FROM Voting v
WHERE
  v.annulled = 0
  AND v.session_key IS NOT NULL
  AND TRIM(v.session_key) != ''
  AND ($startDate IS NULL OR v.start_date >= $startDate)
  AND ($endDateExclusive IS NULL OR v.start_date < $endDateExclusive)
GROUP BY v.session_key
ORDER BY MAX(v.start_time) DESC, count DESC, v.session_key DESC
LIMIT $limit

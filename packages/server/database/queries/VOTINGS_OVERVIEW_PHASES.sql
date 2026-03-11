SELECT
  COALESCE(NULLIF(TRIM(v.section_processing_phase), ''), '(ei vaihetta)') AS value,
  COUNT(*) AS count
FROM Voting v
WHERE
  v.annulled = 0
  AND ($startDate IS NULL OR v.start_date >= $startDate)
  AND ($endDateExclusive IS NULL OR v.start_date < $endDateExclusive)
GROUP BY value
ORDER BY count DESC, value ASC
LIMIT $limit

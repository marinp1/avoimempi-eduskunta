WITH changes AS (
  SELECT start_date AS d, 'join' AS kind, person_id
  FROM Term WHERE start_date IS NOT NULL
  UNION ALL
  SELECT end_date AS d, 'leave' AS kind, person_id
  FROM Term WHERE end_date IS NOT NULL
)
SELECT d AS date,
  SUM(CASE WHEN kind = 'join' THEN 1 ELSE 0 END) AS joined,
  SUM(CASE WHEN kind = 'leave' THEN 1 ELSE 0 END) AS left_count
FROM changes
GROUP BY d
HAVING joined > 0 OR left_count > 0
ORDER BY d

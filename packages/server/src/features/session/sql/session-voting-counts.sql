WITH session_keys AS (
  SELECT value AS session_key
  FROM json_each($sessionKeysJson)
)
SELECT
  v.session_key,
  COUNT(*) AS voting_count
FROM Voting v
WHERE v.session_key IN (
  SELECT session_key
  FROM session_keys
)
GROUP BY v.session_key

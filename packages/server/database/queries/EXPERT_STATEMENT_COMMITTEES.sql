SELECT
  committee_name,
  COUNT(*) AS count
FROM ExpertStatement
WHERE committee_name IS NOT NULL
GROUP BY committee_name
ORDER BY count DESC, committee_name

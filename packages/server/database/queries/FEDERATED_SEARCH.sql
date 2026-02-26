SELECT
  type,
  record_id AS id,
  title,
  subtitle,
  date
FROM FederatedSearchFts
WHERE FederatedSearchFts MATCH $q
ORDER BY date DESC
LIMIT $limit

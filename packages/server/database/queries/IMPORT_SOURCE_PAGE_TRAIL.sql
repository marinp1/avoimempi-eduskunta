SELECT
  id,
  source_table,
  source_page,
  source_pk_name,
  source_pk_value,
  scraped_at,
  migrated_at
FROM ImportSourceReference
WHERE source_table = $tableName
  AND source_page = $page
ORDER BY migrated_at DESC, id DESC
LIMIT $limit OFFSET $offset;

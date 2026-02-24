SELECT
  source_table,
  source_page,
  COUNT(*) AS imported_rows,
  COUNT(
    DISTINCT (
      COALESCE(source_pk_name, '') || ':' || COALESCE(source_pk_value, '')
    )
  ) AS distinct_source_rows,
  MIN(scraped_at) AS first_scraped_at,
  MAX(scraped_at) AS last_scraped_at,
  MIN(migrated_at) AS first_migrated_at,
  MAX(migrated_at) AS last_migrated_at
FROM ImportSourceReference
WHERE source_table = $tableName
GROUP BY source_table, source_page
ORDER BY source_page DESC
LIMIT $limit OFFSET $offset;

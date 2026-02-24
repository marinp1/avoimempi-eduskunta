SELECT
  COUNT(*) AS imported_rows,
  COUNT(DISTINCT source_page) AS distinct_pages,
  MIN(scraped_at) AS first_scraped_at,
  MAX(scraped_at) AS last_scraped_at,
  MIN(migrated_at) AS first_migrated_at,
  MAX(migrated_at) AS last_migrated_at
FROM ImportSourceReference
WHERE source_table = $tableName;

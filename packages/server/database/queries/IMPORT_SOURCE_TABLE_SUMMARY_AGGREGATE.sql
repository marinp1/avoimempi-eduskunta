SELECT
  imported_rows,
  distinct_pages,
  first_scraped_at,
  last_scraped_at,
  first_migrated_at,
  last_migrated_at
FROM ImportSourceReferenceSummary
WHERE source_table = $tableName;

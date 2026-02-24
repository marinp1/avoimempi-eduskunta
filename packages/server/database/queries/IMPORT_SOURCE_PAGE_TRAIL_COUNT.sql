SELECT COUNT(*) AS total_rows
FROM ImportSourceReference
WHERE source_table = $tableName
  AND source_page = $page;

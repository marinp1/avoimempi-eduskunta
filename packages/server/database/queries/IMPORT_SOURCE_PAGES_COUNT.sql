SELECT COUNT(*) AS total_pages
FROM (
  SELECT source_page
  FROM ImportSourceReference
  WHERE source_table = $tableName
  GROUP BY source_page
);

SELECT COUNT(*) AS count
FROM Interpellation i
WHERE
  ($query IS NULL OR (
    i.title LIKE '%' || $query || '%'
    OR i.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR i.parliamentary_year = $year)

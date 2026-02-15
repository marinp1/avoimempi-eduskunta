SELECT COUNT(*) AS count
FROM WrittenQuestion q
WHERE
  ($query IS NULL OR (
    q.title LIKE '%' || $query || '%'
    OR q.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR q.parliamentary_year = $year)

SELECT COUNT(*) AS count
FROM OralQuestion oq
WHERE
  ($query IS NULL OR (
    oq.title LIKE '%' || $query || '%'
    OR oq.question_text LIKE '%' || $query || '%'
    OR oq.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR oq.parliamentary_year = $year)

SELECT COUNT(*) AS count
FROM WrittenQuestionResponse r
JOIN WrittenQuestion q ON q.id = r.question_id
WHERE
  ($query IS NULL OR (
    r.title LIKE '%' || $query || '%'
    OR r.parliament_identifier LIKE '%' || $query || '%'
    OR q.title LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR r.parliamentary_year = $year)
  AND ($minister IS NULL OR r.minister_last_name = $minister)

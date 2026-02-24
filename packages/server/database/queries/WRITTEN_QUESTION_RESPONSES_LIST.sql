SELECT
  r.id,
  r.parliament_identifier,
  r.document_number,
  r.parliamentary_year,
  r.title,
  r.answer_date,
  r.minister_title,
  r.minister_first_name,
  r.minister_last_name,
  q.id AS question_id,
  q.parliament_identifier AS question_identifier,
  q.title AS question_title,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM WrittenQuestionResponse r
JOIN WrittenQuestion q ON q.id = r.question_id
LEFT JOIN WrittenQuestionResponseSubject s ON s.response_id = r.id
WHERE
  ($query IS NULL OR (
    r.title LIKE '%' || $query || '%'
    OR r.parliament_identifier LIKE '%' || $query || '%'
    OR q.title LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR r.parliamentary_year = $year)
  AND ($minister IS NULL OR r.minister_last_name = $minister)
  AND ($startDate IS NULL OR r.answer_date >= $startDate)
  AND ($endDateExclusive IS NULL OR r.answer_date < $endDateExclusive)
GROUP BY r.id
ORDER BY r.answer_date DESC, r.id DESC
LIMIT $limit OFFSET $offset

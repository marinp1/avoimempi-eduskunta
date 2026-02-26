WITH filtered AS (
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
    q.title AS question_title
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
    AND ($startDate IS NULL OR r.answer_date >= $startDate)
    AND ($endDateExclusive IS NULL OR r.answer_date < $endDateExclusive)
  ORDER BY r.answer_date DESC, r.id DESC
  LIMIT $limit OFFSET $offset
)
SELECT
  f.id,
  f.parliament_identifier,
  f.document_number,
  f.parliamentary_year,
  f.title,
  f.answer_date,
  f.minister_title,
  f.minister_first_name,
  f.minister_last_name,
  f.question_id,
  f.question_identifier,
  f.question_title,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM WrittenQuestionResponseSubject s
    WHERE s.response_id = f.id
  ) AS subjects
FROM filtered f
ORDER BY f.answer_date DESC, f.id DESC

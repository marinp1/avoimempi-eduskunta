WITH filtered AS (
  SELECT
    oq.id,
    oq.parliament_identifier,
    oq.document_number,
    oq.parliamentary_year,
    oq.title,
    oq.question_text,
    oq.asker_text,
    oq.submission_date,
    oq.decision_outcome,
    oq.decision_outcome_code,
    oq.latest_stage_code,
    oq.end_date
  FROM OralQuestion oq
  WHERE
    ($query IS NULL OR (
      oq.title LIKE '%' || $query || '%'
      OR oq.question_text LIKE '%' || $query || '%'
      OR oq.parliament_identifier LIKE '%' || $query || '%'
    ))
    AND ($year IS NULL OR oq.parliamentary_year = $year)
    AND ($subject IS NULL OR EXISTS (
      SELECT 1 FROM OralQuestionSubject
      WHERE question_id = oq.id AND subject_text = $subject
    ))
    AND ($startDate IS NULL OR oq.submission_date >= $startDate)
    AND ($endDateExclusive IS NULL OR oq.submission_date < $endDateExclusive)
  ORDER BY oq.submission_date DESC, oq.id DESC
  LIMIT $limit OFFSET $offset
)
SELECT
  f.id,
  f.parliament_identifier,
  f.document_number,
  f.parliamentary_year,
  f.title,
  f.question_text,
  f.asker_text,
  f.submission_date,
  f.decision_outcome,
  f.decision_outcome_code,
  f.latest_stage_code,
  f.end_date,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM OralQuestionSubject s
    WHERE s.question_id = f.id
  ) AS subjects
FROM filtered f
ORDER BY f.submission_date DESC, f.id DESC

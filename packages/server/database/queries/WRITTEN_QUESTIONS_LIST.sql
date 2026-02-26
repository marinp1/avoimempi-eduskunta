WITH filtered AS (
  SELECT
    q.id,
    q.parliament_identifier,
    q.document_number,
    q.parliamentary_year,
    q.title,
    q.submission_date,
    q.first_signer_first_name,
    q.first_signer_last_name,
    q.first_signer_party,
    q.co_signer_count,
    q.answer_minister_first_name,
    q.answer_minister_last_name,
    q.answer_minister_title,
    q.answer_date,
    q.decision_outcome,
    q.decision_outcome_code,
    q.latest_stage_code,
    q.end_date
  FROM WrittenQuestion q
  WHERE
    ($query IS NULL OR (
      q.title LIKE '%' || $query || '%'
      OR q.parliament_identifier LIKE '%' || $query || '%'
    ))
    AND ($year IS NULL OR q.parliamentary_year = $year)
    AND ($subject IS NULL OR EXISTS (
      SELECT 1 FROM WrittenQuestionSubject
      WHERE question_id = q.id AND subject_text = $subject
    ))
    AND ($startDate IS NULL OR q.submission_date >= $startDate)
    AND ($endDateExclusive IS NULL OR q.submission_date < $endDateExclusive)
  ORDER BY q.submission_date DESC, q.id DESC
  LIMIT $limit OFFSET $offset
)
SELECT
  f.id,
  f.parliament_identifier,
  f.document_number,
  f.parliamentary_year,
  f.title,
  f.submission_date,
  f.first_signer_first_name,
  f.first_signer_last_name,
  f.first_signer_party,
  f.co_signer_count,
  f.answer_minister_first_name,
  f.answer_minister_last_name,
  f.answer_minister_title,
  f.answer_date,
  f.decision_outcome,
  f.decision_outcome_code,
  f.latest_stage_code,
  f.end_date,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM WrittenQuestionSubject s
    WHERE s.question_id = f.id
  ) AS subjects
FROM filtered f
ORDER BY f.submission_date DESC, f.id DESC

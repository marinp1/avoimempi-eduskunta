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
  q.end_date,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM WrittenQuestion q
LEFT JOIN WrittenQuestionSubject s ON s.question_id = q.id
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
GROUP BY q.id
ORDER BY q.submission_date DESC, q.id DESC
LIMIT $limit OFFSET $offset

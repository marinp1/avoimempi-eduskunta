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
  oq.end_date,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM OralQuestion oq
LEFT JOIN OralQuestionSubject s ON s.question_id = oq.id
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
GROUP BY oq.id
ORDER BY oq.submission_date DESC, oq.id DESC
LIMIT $limit OFFSET $offset

SELECT COUNT(*) AS count
FROM WrittenQuestion q
WHERE
  ($query IS NULL OR q.id IN (
    SELECT CAST(record_id AS INTEGER)
    FROM FederatedSearchFts
    WHERE FederatedSearchFts MATCH $query
      AND type = 'written-question'
  ))
  AND ($year IS NULL OR q.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM WrittenQuestionSubject
    WHERE question_id = q.id AND subject_text = $subject
  ))
  AND ($startDate IS NULL OR q.submission_date >= $startDate)
  AND ($endDateExclusive IS NULL OR q.submission_date < $endDateExclusive)

SELECT COUNT(*) AS count
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

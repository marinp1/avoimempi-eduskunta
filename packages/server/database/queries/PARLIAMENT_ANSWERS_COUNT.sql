SELECT COUNT(*) AS count
FROM ParliamentAnswer pa
WHERE
  ($query IS NULL OR (
    pa.title LIKE '%' || $query || '%'
    OR pa.parliament_identifier LIKE '%' || $query || '%'
    OR pa.source_reference LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR pa.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM ParliamentAnswerSubject s
    WHERE s.answer_id = pa.id AND s.subject_text = $subject
  ))
  AND ($startDate IS NULL OR COALESCE(pa.signature_date, pa.submission_date) >= $startDate)
  AND ($endDateExclusive IS NULL OR COALESCE(pa.signature_date, pa.submission_date) < $endDateExclusive)

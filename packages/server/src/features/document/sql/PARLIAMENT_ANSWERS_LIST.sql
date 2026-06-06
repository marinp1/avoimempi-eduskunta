SELECT
  pa.id,
  pa.parliament_identifier,
  pa.document_number,
  pa.parliamentary_year,
  pa.title,
  pa.source_reference,
  pa.committee_report_reference,
  pa.submission_date,
  pa.signature_date,
  pa.signatory_count,
  GROUP_CONCAT(pas.subject_text, '||') AS subjects
FROM ParliamentAnswer pa
LEFT JOIN ParliamentAnswerSubject pas ON pas.answer_id = pa.id
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
GROUP BY pa.id
ORDER BY pa.signature_date DESC, pa.id DESC
LIMIT $limit OFFSET $offset

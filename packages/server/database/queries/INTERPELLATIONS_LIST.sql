SELECT
  i.id,
  i.parliament_identifier,
  i.document_number,
  i.parliamentary_year,
  i.title,
  i.submission_date,
  i.first_signer_first_name,
  i.first_signer_last_name,
  i.first_signer_party,
  i.co_signer_count,
  i.decision_outcome,
  i.decision_outcome_code,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM Interpellation i
LEFT JOIN InterpellationSubject s ON s.interpellation_id = i.id
WHERE
  ($query IS NULL OR (
    i.title LIKE '%' || $query || '%'
    OR i.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR i.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM InterpellationSubject
    WHERE interpellation_id = i.id AND subject_text = $subject
  ))
  AND ($startDate IS NULL OR i.submission_date >= $startDate)
  AND ($endDateExclusive IS NULL OR i.submission_date < $endDateExclusive)
GROUP BY i.id
ORDER BY i.submission_date DESC, i.id DESC
LIMIT $limit OFFSET $offset

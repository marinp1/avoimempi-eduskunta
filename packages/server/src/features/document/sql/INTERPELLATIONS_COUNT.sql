SELECT COUNT(*) AS count
FROM Interpellation i
WHERE
  ($query IS NULL OR i.id IN (
    SELECT CAST(record_id AS INTEGER)
    FROM FederatedSearchFts
    WHERE FederatedSearchFts MATCH $query
      AND type = 'interpellation'
  ))
  AND ($year IS NULL OR i.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM InterpellationSubject
    WHERE interpellation_id = i.id AND subject_text = $subject
  ))
  AND ($startDate IS NULL OR i.submission_date >= $startDate)
  AND ($endDateExclusive IS NULL OR i.submission_date < $endDateExclusive)

SELECT COUNT(*) AS count
FROM Interpellation i
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

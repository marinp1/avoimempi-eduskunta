SELECT COUNT(*) AS count
FROM LegislativeInitiative li
WHERE
  ($query IS NULL OR (
    li.title LIKE '%' || $query || '%'
    OR li.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR li.parliamentary_year = $year)
  AND ($typeCode IS NULL OR li.initiative_type_code = $typeCode)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM LegislativeInitiativeSubject
    WHERE initiative_id = li.id AND subject_text = $subject
  ))
  AND ($startDate IS NULL OR li.submission_date >= $startDate)
  AND ($endDateExclusive IS NULL OR li.submission_date < $endDateExclusive)

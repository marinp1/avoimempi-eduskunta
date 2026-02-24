SELECT COUNT(*) AS count
FROM ExpertStatement e
WHERE
  ($query IS NULL OR (
    e.title LIKE '%' || $query || '%'
    OR e.edk_identifier LIKE '%' || $query || '%'
    OR e.bill_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR substr(e.meeting_date, 1, 4) = $year)
  AND ($committee IS NULL OR e.committee_name = $committee)
  AND ($docType IS NULL OR e.document_type = $docType)
  AND ($startDate IS NULL OR e.meeting_date >= $startDate)
  AND ($endDateExclusive IS NULL OR e.meeting_date < $endDateExclusive)

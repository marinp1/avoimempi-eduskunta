SELECT COUNT(*) AS count
FROM CommitteeReport c
WHERE
  ($query IS NULL OR (
    c.title LIKE '%' || $query || '%'
    OR c.parliament_identifier LIKE '%' || $query || '%'
    OR c.committee_name LIKE '%' || $query || '%'
    OR c.source_reference LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR c.parliamentary_year = $year)

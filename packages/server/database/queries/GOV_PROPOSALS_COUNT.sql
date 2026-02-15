SELECT COUNT(*) AS count
FROM GovernmentProposal g
WHERE
  ($query IS NULL OR (
    g.title LIKE '%' || $query || '%'
    OR g.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR g.parliamentary_year = $year)

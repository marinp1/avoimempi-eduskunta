SELECT COUNT(*) AS count
FROM LegislativeInitiative li
WHERE
  ($query IS NULL OR (
    li.title LIKE '%' || $query || '%'
    OR li.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR li.parliamentary_year = $year)
  AND ($typeCode IS NULL OR li.initiative_type_code = $typeCode)

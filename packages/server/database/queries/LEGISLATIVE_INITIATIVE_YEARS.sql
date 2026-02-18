SELECT DISTINCT parliamentary_year AS year
FROM LegislativeInitiative
WHERE ($typeCode IS NULL OR initiative_type_code = $typeCode)
ORDER BY parliamentary_year DESC

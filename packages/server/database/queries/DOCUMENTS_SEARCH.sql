SELECT
  d.id,
  d.eduskunta_tunnus,
  d.document_type_code,
  d.document_type_name,
  d.document_number,
  d.parliamentary_year,
  d.title,
  d.author_first_name,
  d.author_last_name,
  d.author_role,
  d.creation_date,
  d.status,
  d.summary,
  GROUP_CONCAT(DISTINCT ds.subject_text) AS subjects
FROM VaskiDocument d
LEFT JOIN DocumentSubject ds ON d.id = ds.document_id
WHERE
  ($q IS NULL OR d.title LIKE '%' || $q || '%' OR d.eduskunta_tunnus LIKE '%' || $q || '%')
  AND ($type IS NULL OR d.document_type_code = $type)
  AND ($year IS NULL OR d.parliamentary_year = $year)
GROUP BY d.id
ORDER BY d.creation_date DESC
LIMIT $limit OFFSET $offset;

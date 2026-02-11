SELECT
  d.id,
  d.eduskunta_tunnus,
  d.document_type_code,
  d.type_name_fi AS document_type_name,
  d.document_number_text AS document_number,
  d.parliamentary_year_text AS parliamentary_year,
  d.title,
  d.created_at AS created,
  d.status_text AS status,
  NULL AS summary_text,
  GROUP_CONCAT(DISTINCT ds.subject_text) AS subjects
FROM Document d
LEFT JOIN DocumentSubject ds ON d.id = ds.document_id
WHERE
  ($q IS NULL OR d.title LIKE '%' || $q || '%' OR d.eduskunta_tunnus LIKE '%' || $q || '%')
  AND ($type IS NULL OR d.document_type_code = $type)
  AND ($year IS NULL OR d.parliamentary_year_text = $year)
GROUP BY d.id
ORDER BY d.created_at DESC
LIMIT $limit OFFSET $offset;

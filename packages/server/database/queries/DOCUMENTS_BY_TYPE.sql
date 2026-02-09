SELECT
  d.document_type_code,
  d.document_type_name,
  COUNT(*) AS document_count,
  MIN(d.creation_date) AS earliest,
  MAX(d.creation_date) AS latest
FROM VaskiDocument d
GROUP BY d.document_type_code, d.document_type_name
ORDER BY document_count DESC;

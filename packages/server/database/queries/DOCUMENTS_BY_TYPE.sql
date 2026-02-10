SELECT
  d.document_type_code,
  d.document_type_name,
  COUNT(*) AS document_count,
  MIN(d.created) AS earliest,
  MAX(d.created) AS latest
FROM VaskiDocument d
GROUP BY d.document_type_code, d.document_type_name
ORDER BY document_count DESC;

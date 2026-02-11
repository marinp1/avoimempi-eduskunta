SELECT
  d.document_type_code,
  d.type_name_fi AS document_type_name,
  COUNT(*) AS document_count,
  MIN(d.created_at) AS earliest,
  MAX(d.created_at) AS latest
FROM Document d
GROUP BY d.document_type_code, d.type_name_fi
ORDER BY document_count DESC;

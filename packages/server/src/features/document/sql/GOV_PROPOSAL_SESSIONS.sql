SELECT DISTINCT
  s.key AS session_key,
  s.date AS session_date,
  s.type AS session_type,
  s.number AS session_number,
  s.year AS session_year,
  sec.title AS section_title,
  sec.key AS section_key
FROM Section sec
JOIN Session s ON sec.session_key = s.key
JOIN SectionDocumentReference ref ON ref.section_key = sec.key
WHERE ref.document_identifier = $identifier
ORDER BY s.date ASC, sec.ordinal ASC

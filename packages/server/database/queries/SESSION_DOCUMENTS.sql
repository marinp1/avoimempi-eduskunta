SELECT
  'agenda' AS document_kind,
  s.agenda_document_id AS id,
  NULL AS type_slug,
  NULL AS type_name_fi,
  NULL AS root_family,
  NULL AS eduskunta_tunnus,
  NULL AS document_type_code,
  NULL AS document_number_text,
  NULL AS parliamentary_year_text,
  NULL AS title,
  NULL AS status_text,
  NULL AS created_at
FROM Session s
WHERE s.key = $sessionKey
  AND s.agenda_document_id IS NOT NULL

UNION ALL

SELECT
  'minutes' AS document_kind,
  s.minutes_document_id AS id,
  NULL AS type_slug,
  NULL AS type_name_fi,
  NULL AS root_family,
  NULL AS eduskunta_tunnus,
  NULL AS document_type_code,
  NULL AS document_number_text,
  NULL AS parliamentary_year_text,
  NULL AS title,
  NULL AS status_text,
  NULL AS created_at
FROM Session s
WHERE s.key = $sessionKey
  AND s.minutes_document_id IS NOT NULL

UNION ALL

SELECT
  'roll_call' AS document_kind,
  s.roll_call_document_id AS id,
  NULL AS type_slug,
  NULL AS type_name_fi,
  NULL AS root_family,
  NULL AS eduskunta_tunnus,
  NULL AS document_type_code,
  NULL AS document_number_text,
  NULL AS parliamentary_year_text,
  NULL AS title,
  NULL AS status_text,
  NULL AS created_at
FROM Session s
WHERE s.key = $sessionKey
  AND s.roll_call_document_id IS NOT NULL
ORDER BY document_kind ASC;

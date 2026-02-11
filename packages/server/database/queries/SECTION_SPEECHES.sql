SELECT
  sp.id,
  sp.key,
  sp.session_key,
  sp.section_key,
  sp.ordinal,
  sp.ordinal_number,
  sp.speech_type,
  sp.request_method,
  sp.request_time,
  sp.person_id,
  sp.first_name,
  sp.last_name,
  sp.gender,
  sp.party_abbreviation,
  sp.has_spoken,
  sp.ministry,
  sp.modified_datetime,
  NULL AS excel_key,
  sp.created_datetime,
  sp.imported_datetime,
  sp.ad_tunnus,
  sp.order_raw,
  NULL AS content,
  NULL AS start_time,
  NULL AS end_time,
  NULL AS minutes_url
FROM Speech sp
WHERE sp.section_key = $sectionKey
ORDER BY
  CASE WHEN ordinal_number IS NULL THEN 1 ELSE 0 END,
  ordinal_number,
  request_time,
  id
LIMIT $limit OFFSET $offset;

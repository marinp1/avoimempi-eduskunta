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
  sc.content AS content,
  COALESCE(sc.start_time, sp.request_time, sp.created_datetime) AS start_time,
  sc.end_time AS end_time,
  NULL AS minutes_url
FROM Speech sp
LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
WHERE sp.section_key = $sectionKey
  AND COALESCE(sp.has_spoken, 1) = 1
ORDER BY
  CASE WHEN ordinal_number IS NULL THEN 1 ELSE 0 END,
  ordinal_number,
  COALESCE(sc.start_time, sp.request_time, sp.created_datetime),
  id
LIMIT $limit OFFSET $offset;

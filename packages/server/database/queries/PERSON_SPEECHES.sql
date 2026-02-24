SELECT
  sp.id,
  sp.section_key AS section_key,
  sp.session_key AS session_key,
  sec.title AS section_title,
  sec.identifier AS section_identifier,
  COALESCE(sc.start_time, sp.request_time, sp.modified_datetime) AS start_time,
  sc.end_time AS end_time,
  sp.speech_type,
  sec.processing_title AS processing_phase,
  COALESCE(sec.title, sec.processing_title, sec.identifier, sp.section_key) AS document,
  sc.content AS content,
  sp.party_abbreviation AS party,
  NULL AS minutes_url,
  CASE
    WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
    ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
  END AS word_count
FROM Speech sp
LEFT JOIN Section sec ON sp.section_key = sec.key
LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
WHERE sp.person_id = $personId
  AND COALESCE(sp.has_spoken, 1) = 1
ORDER BY COALESCE(sc.start_time, sp.request_time, sp.modified_datetime) DESC
LIMIT $limit OFFSET $offset;

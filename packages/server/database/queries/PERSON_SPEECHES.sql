SELECT
  sp.id,
  COALESCE(sp.request_time, sp.modified_datetime) AS start_time,
  NULL AS end_time,
  sp.speech_type,
  sec.processing_title AS processing_phase,
  COALESCE(sec.title, sec.processing_title, sec.identifier, sp.section_key) AS document,
  NULL AS content,
  sp.party_abbreviation AS party,
  NULL AS minutes_url,
  0 AS word_count
FROM Speech sp
LEFT JOIN Section sec ON sp.section_key = sec.key
WHERE sp.person_id = $personId
ORDER BY COALESCE(sp.request_time, sp.modified_datetime) DESC
LIMIT $limit OFFSET $offset;

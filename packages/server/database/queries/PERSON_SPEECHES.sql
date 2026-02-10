SELECT
  sp.id,
  vms.start_time,
  vms.end_time,
  sp.speech_type,
  sec.processing_title AS processing_phase,
  COALESCE(sec.title, sec.processing_title, sec.identifier, sp.section_key) AS document,
  vms.content,
  sp.party_abbreviation AS party,
  NULL AS minutes_url,
  CASE
    WHEN vms.content IS NOT NULL THEN LENGTH(vms.content) - LENGTH(REPLACE(vms.content, ' ', '')) + 1
    ELSE 0
  END AS word_count
FROM Speech sp
LEFT JOIN VaskiMinutesSpeech vms ON sp.excel_key = vms.link_key COLLATE NOCASE
LEFT JOIN Section sec ON sp.section_key = sec.key
WHERE sp.person_id = $personId
ORDER BY vms.start_time DESC
LIMIT $limit OFFSET $offset;

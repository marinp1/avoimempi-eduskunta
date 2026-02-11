SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  COUNT(*) AS speech_count,
  SUM(CASE
        WHEN vms.content IS NOT NULL THEN LENGTH(vms.content) - LENGTH(REPLACE(vms.content, ' ', '')) + 1
        ELSE 0
      END) AS total_words,
  ROUND(AVG(CASE
        WHEN vms.content IS NOT NULL THEN LENGTH(vms.content) - LENGTH(REPLACE(vms.content, ' ', '')) + 1
        ELSE 0
      END), 0) AS avg_words_per_speech,
  MIN(vms.start_time) AS first_speech,
  MAX(vms.start_time) AS last_speech
FROM Speech sp
LEFT JOIN SessionSectionSpeech vms ON sp.excel_key = vms.link_key COLLATE NOCASE
JOIN Representative r ON sp.person_id = r.person_id
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
GROUP BY r.person_id, r.first_name, r.last_name, r.party
ORDER BY speech_count DESC
LIMIT $limit;

SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  COUNT(*) AS speech_count,
  SUM(LENGTH(es.content) - LENGTH(REPLACE(es.content, ' ', '')) + 1) AS total_words,
  ROUND(AVG(LENGTH(es.content) - LENGTH(REPLACE(es.content, ' ', '')) + 1), 0) AS avg_words_per_speech,
  MIN(es.start_time) AS first_speech,
  MAX(es.start_time) AS last_speech
FROM ExcelSpeech es
JOIN Representative r ON es.first_name = r.first_name AND es.last_name = r.last_name
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
GROUP BY r.person_id, r.first_name, r.last_name, r.party
ORDER BY speech_count DESC
LIMIT $limit;

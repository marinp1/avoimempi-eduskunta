SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  COUNT(*) AS speech_count,
  0 AS total_words,
  0 AS avg_words_per_speech,
  MIN(COALESCE(sp.request_time, sp.modified_datetime)) AS first_speech,
  MAX(COALESCE(sp.request_time, sp.modified_datetime)) AS last_speech
FROM Speech sp
JOIN Representative r ON sp.person_id = r.person_id
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
GROUP BY r.person_id, r.first_name, r.last_name, r.party
ORDER BY speech_count DESC
LIMIT $limit;

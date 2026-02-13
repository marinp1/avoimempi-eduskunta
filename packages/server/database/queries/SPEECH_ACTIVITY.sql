SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  COUNT(*) AS speech_count,
  SUM(
    CASE
      WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
      ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
    END
  ) AS total_words,
  ROUND(
    (
      SUM(
        CASE
          WHEN sc.content IS NULL OR TRIM(sc.content) = '' THEN 0
          ELSE LENGTH(TRIM(sc.content)) - LENGTH(REPLACE(TRIM(sc.content), ' ', '')) + 1
        END
      ) * 1.0
    ) / COUNT(*),
    2
  ) AS avg_words_per_speech,
  MIN(COALESCE(sp.request_time, sp.modified_datetime)) AS first_speech,
  MAX(COALESCE(sp.request_time, sp.modified_datetime)) AS last_speech
FROM Speech sp
JOIN Representative r ON sp.person_id = r.person_id
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
LEFT JOIN SpeechContent sc ON sc.speech_id = sp.id
WHERE COALESCE(sp.has_spoken, 1) = 1
GROUP BY r.person_id, r.first_name, r.last_name, r.party
ORDER BY speech_count DESC
LIMIT $limit;

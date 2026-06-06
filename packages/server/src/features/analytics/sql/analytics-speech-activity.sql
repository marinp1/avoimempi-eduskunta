SELECT
  r.person_id,
  r.first_name,
  r.last_name,
  r.party,
  SUM(psds.speech_count) AS speech_count,
  SUM(psds.total_words) AS total_words,
  ROUND(
    (SUM(psds.total_words) * 1.0) / NULLIF(SUM(psds.speech_count), 0),
    2
  ) AS avg_words_per_speech,
  MIN(psds.first_speech) AS first_speech,
  MAX(psds.last_speech) AS last_speech
FROM PersonSpeechDailyStats psds
JOIN Representative r ON psds.person_id = r.person_id
WHERE EXISTS (
    SELECT 1
    FROM Term t
    WHERE t.person_id = r.person_id
      AND t.end_date IS NULL
  )
  AND ($startDate IS NULL OR psds.speech_date >= $startDate)
  AND ($endDateExclusive IS NULL OR psds.speech_date < $endDateExclusive)
GROUP BY r.person_id, r.first_name, r.last_name, r.party
ORDER BY speech_count DESC
LIMIT $limit;

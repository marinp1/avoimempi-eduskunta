SELECT
  es.id,
  es.start_time,
  es.end_time,
  es.speech_type,
  es.processing_phase,
  es.document,
  es.content,
  es.party,
  es.minutes_url,
  LENGTH(es.content) - LENGTH(REPLACE(es.content, ' ', '')) + 1 AS word_count
FROM ExcelSpeech es
WHERE es.first_name = (SELECT first_name FROM Representative WHERE person_id = $personId)
  AND es.last_name = (SELECT last_name FROM Representative WHERE person_id = $personId)
ORDER BY es.start_time DESC
LIMIT $limit OFFSET $offset;

SELECT
  id,
  session_key,
  section_key,
  notice_type,
  text_fi,
  valid_until,
  sent_at,
  created_datetime,
  modified_datetime
FROM SessionNotice
WHERE session_key IN (SELECT value FROM json_each($sessionKeysJson))
ORDER BY session_key, COALESCE(sent_at, created_datetime) ASC

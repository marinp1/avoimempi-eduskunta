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
WHERE session_key = $sessionKey
ORDER BY COALESCE(sent_at, created_datetime) ASC;

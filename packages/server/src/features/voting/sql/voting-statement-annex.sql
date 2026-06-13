SELECT
  id,
  edk_identifier,
  title
FROM PlenaryAnnex
WHERE source_reference = $sourceReference
  AND session_key = $sessionKey
  AND title LIKE 'Lausumaehdotu%'
ORDER BY id DESC
LIMIT 1

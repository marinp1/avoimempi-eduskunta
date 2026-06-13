WITH section_keys AS (
  SELECT value AS section_key
  FROM json_each($sectionKeysJson)
),
target_sections AS (
  SELECT
    sec.key,
    sec.minutes_related_document_identifier
  FROM Section sec
  WHERE sec.key IN (SELECT section_key FROM section_keys)
    AND sec.minutes_related_document_identifier IS NOT NULL
    AND sec.minutes_related_document_identifier != ''
)
SELECT
  ts.key AS section_key,
  rr.id,
  rr.parliament_identifier,
  rr.session_date,
  rr.roll_call_start_time,
  rr.roll_call_end_time,
  rr.title,
  rr.status,
  rr.created_at,
  rr.edk_identifier,
  rr.source_path,
  rr.attachment_group_id,
  COUNT(rce.entry_order) AS entry_count,
  COALESCE(SUM(CASE WHEN rce.entry_type = 'absent' THEN 1 ELSE 0 END), 0) AS absent_count,
  COALESCE(SUM(CASE WHEN rce.entry_type = 'late' THEN 1 ELSE 0 END), 0) AS late_count
FROM target_sections ts
JOIN RollCallReport rr
  ON (
    rr.edk_identifier = ts.minutes_related_document_identifier
    OR rr.parliament_identifier = ts.minutes_related_document_identifier
  )
LEFT JOIN RollCallEntry rce ON rce.roll_call_id = rr.id
GROUP BY ts.key, rr.id
ORDER BY rr.created_at DESC, rr.id DESC

WITH section_keys AS (
  SELECT value AS section_key
  FROM json_each($sectionKeysJson)
)
SELECT
  v.id,
  v.number,
  v.start_time,
  v.annulled,
  v.title,
  v.proceedings_name,
  v.proceedings_url,
  v.result_url,
  v.n_yes,
  v.n_no,
  v.n_abstain,
  v.n_absent,
  v.n_total,
  v.section_processing_phase,
  v.modified_datetime,
  v.section_title,
  v.section_id,
  v.section_key,
  v.main_section_id,
  v.session_key
FROM Voting v
WHERE v.section_key IN (SELECT section_key FROM section_keys)
  AND v.annulled = 0
ORDER BY v.section_key, v.number ASC

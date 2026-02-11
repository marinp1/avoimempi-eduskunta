SELECT
  v.*,
  COALESCE(
    NULLIF(TRIM(v.section_title), ''),
    NULLIF(TRIM(v.main_section_title), ''),
    NULLIF(TRIM(v.agenda_title), ''),
    NULLIF(TRIM(v.title), ''),
    '(ei otsikkoa)'
  ) AS context_title
FROM Voting v
WHERE (
  COALESCE(NULLIF(TRIM(v.section_title), ''), '') LIKE $query
  OR COALESCE(NULLIF(TRIM(v.main_section_title), ''), '') LIKE $query
  OR COALESCE(NULLIF(TRIM(v.agenda_title), ''), '') LIKE $query
  OR COALESCE(NULLIF(TRIM(v.title), ''), '') LIKE $query
  OR COALESCE(NULLIF(TRIM(v.section_processing_title), ''), '') LIKE $query
  OR COALESCE(NULLIF(TRIM(v.session_key), ''), '') LIKE $query
)
ORDER BY v.start_time DESC, v.id DESC
LIMIT 200

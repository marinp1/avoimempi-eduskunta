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
WHERE
  COALESCE(v.title, '') LIKE '%' || $query || '%' COLLATE NOCASE
  OR COALESCE(v.section_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
  OR COALESCE(v.main_section_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
  OR COALESCE(v.agenda_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
  OR COALESCE(v.section_processing_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
  OR COALESCE(v.session_key, '') LIKE '%' || $query || '%' COLLATE NOCASE
ORDER BY v.start_time DESC, v.id DESC
LIMIT 200

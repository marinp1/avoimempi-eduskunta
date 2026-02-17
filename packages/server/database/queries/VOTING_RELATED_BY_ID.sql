SELECT
  v2.id,
  v2.number,
  v2.start_time,
  COALESCE(
    NULLIF(TRIM(v2.section_title), ''),
    NULLIF(TRIM(v2.main_section_title), ''),
    NULLIF(TRIM(v2.agenda_title), ''),
    NULLIF(TRIM(v2.title), ''),
    '(ei otsikkoa)'
  ) AS context_title,
  v2.n_yes,
  v2.n_no,
  v2.n_abstain,
  v2.n_absent,
  v2.n_total,
  v2.session_key
FROM Voting v1
JOIN Voting v2 ON v2.parliamentary_item = v1.parliamentary_item
WHERE v1.id = $id
  AND v1.parliamentary_item IS NOT NULL
  AND TRIM(v1.parliamentary_item) != ''
  AND v2.id != v1.id
ORDER BY v2.start_time ASC, v2.id ASC
LIMIT 25

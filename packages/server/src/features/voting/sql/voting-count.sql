SELECT COUNT(*) AS total
FROM Voting v
WHERE
  v.annulled = 0
  AND ($query IS NULL
    OR COALESCE(v.title, '') LIKE '%' || $query || '%' COLLATE NOCASE
    OR COALESCE(v.section_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
    OR COALESCE(v.main_section_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
    OR COALESCE(v.agenda_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
    OR COALESCE(v.section_processing_title, '') LIKE '%' || $query || '%' COLLATE NOCASE
    OR COALESCE(v.session_key, '') LIKE '%' || $query || '%' COLLATE NOCASE)
  AND ($phase IS NULL OR v.section_processing_phase = $phase)
  AND ($session IS NULL OR v.session_key = $session)
  AND ($startDate IS NULL OR v.start_date >= $startDate)
  AND ($endDateExclusive IS NULL OR v.start_date < $endDateExclusive)
  AND ($type IS NULL OR
    CASE $type
      WHEN 'lait' THEN
        COALESCE(v.title, '') LIKE '%laki%' COLLATE NOCASE
        AND COALESCE(v.title, '') NOT LIKE '%luottamus%' COLLATE NOCASE
        AND COALESCE(v.title, '') NOT LIKE '%selonteko%' COLLATE NOCASE
      WHEN 'selonteot' THEN
        COALESCE(v.title, '') LIKE '%selonteko%' COLLATE NOCASE
      WHEN 'luottamus' THEN
        COALESCE(v.title, '') LIKE '%luottamus%' COLLATE NOCASE
        OR COALESCE(v.title, '') LIKE '%välikysymys%' COLLATE NOCASE
      WHEN 'tiukat' THEN
        v.n_total > 0 AND ABS(v.n_yes - v.n_no) < 10
      ELSE 0
    END
  )

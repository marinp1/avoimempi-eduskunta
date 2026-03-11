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
  v.annulled = 0
  AND v.n_total > 0
  AND ($startDate IS NULL OR v.start_date >= $startDate)
  AND ($endDateExclusive IS NULL OR v.start_date < $endDateExclusive)
ORDER BY ABS(v.n_yes - v.n_no) ASC, v.start_time DESC, v.id DESC
LIMIT $limit

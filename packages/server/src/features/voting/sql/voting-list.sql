SELECT
  v.*,
  COALESCE(
    NULLIF(TRIM(v.section_title), ''),
    NULLIF(TRIM(v.main_section_title), ''),
    NULLIF(TRIM(v.agenda_title), ''),
    NULLIF(TRIM(v.title), ''),
    '(ei otsikkoa)'
  ) AS context_title,
  dr.doc_tunnuses
FROM Voting v
LEFT JOIN (
  SELECT voting_id, GROUP_CONCAT(document_tunnus, '||') AS doc_tunnuses
  FROM SaliDBDocumentReference
  WHERE source_type = 'voting_item'
  GROUP BY voting_id
) dr ON dr.voting_id = v.id
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
ORDER BY
  CASE WHEN $sort = 'largest' THEN v.n_total END DESC,
  CASE WHEN $sort = 'closest' THEN ABS(v.n_yes - v.n_no) END ASC,
  CASE WHEN $sort = 'oldest' THEN v.start_time END ASC,
  CASE WHEN $sort = 'newest' THEN v.start_time END DESC,
  CASE WHEN $sort = 'largest' THEN v.start_time END DESC,
  CASE WHEN $sort = 'closest' THEN v.start_time END DESC,
  CASE WHEN $sort = 'oldest' THEN v.id END ASC,
  CASE WHEN $sort IN ('newest', 'largest', 'closest') THEN v.id END DESC
LIMIT $limit

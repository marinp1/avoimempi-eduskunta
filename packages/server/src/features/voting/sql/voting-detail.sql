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
WHERE v.id = $id
LIMIT 1

SELECT DISTINCT
  v.*,
  v.section_title AS context_title
FROM SaliDBDocumentReference dr
JOIN Voting v ON v.id = dr.voting_id
WHERE dr.document_tunnus = $identifier
ORDER BY v.start_time DESC, v.id DESC

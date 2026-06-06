SELECT DISTINCT
  ref.document_tunnus AS identifier,
  ref.source_type,
  ref.source_text,
  ref.source_url
FROM SaliDBDocumentReference ref
WHERE ref.voting_id = $votingId
ORDER BY ref.id ASC;

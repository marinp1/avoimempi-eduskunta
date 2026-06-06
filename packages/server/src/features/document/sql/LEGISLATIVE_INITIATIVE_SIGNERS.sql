SELECT
  initiative_id,
  signer_order,
  person_id,
  first_name,
  last_name,
  party,
  is_first_signer
FROM LegislativeInitiativeSigner
WHERE initiative_id = $initiativeId
ORDER BY signer_order ASC

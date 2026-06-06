SELECT
  interpellation_id,
  signer_order,
  person_id,
  first_name,
  last_name,
  party,
  is_first_signer
FROM InterpellationSigner
WHERE interpellation_id = $interpellationId
ORDER BY signer_order

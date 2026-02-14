SELECT
  i.id,
  i.parliament_identifier,
  i.document_number,
  i.parliamentary_year,
  i.title,
  i.submission_date,
  i.first_signer_person_id,
  i.first_signer_first_name,
  i.first_signer_last_name,
  i.first_signer_party,
  i.co_signer_count,
  i.decision_outcome,
  i.decision_outcome_code
FROM Interpellation i
WHERE i.parliament_identifier = $identifier

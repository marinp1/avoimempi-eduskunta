SELECT
  li.id,
  li.initiative_type_code,
  li.parliament_identifier,
  li.document_number,
  li.parliamentary_year,
  li.title,
  li.submission_date,
  li.first_signer_person_id,
  li.first_signer_first_name,
  li.first_signer_last_name,
  li.first_signer_party,
  li.justification_text,
  li.proposal_text,
  li.law_text,
  li.decision_outcome,
  li.decision_outcome_code,
  li.latest_stage_code,
  li.end_date
FROM LegislativeInitiative li
WHERE li.parliament_identifier = $identifier

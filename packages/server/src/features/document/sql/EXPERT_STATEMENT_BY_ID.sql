SELECT
  e.id,
  e.document_type,
  e.edk_identifier,
  e.bill_identifier,
  e.committee_name,
  e.meeting_identifier,
  e.meeting_date,
  e.title,
  e.publicity,
  e.language,
  e.body_text,
  e.author_text,
  e.author_organization
FROM ExpertStatement e
WHERE e.id = $id

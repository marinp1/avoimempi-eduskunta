SELECT
  e.id,
  e.document_type,
  e.edk_identifier,
  e.committee_name,
  e.meeting_date,
  e.title
FROM ExpertStatement e
WHERE e.bill_identifier = $identifier
  AND e.document_type = 'asiantuntijalausunto'
ORDER BY e.meeting_date ASC NULLS LAST, e.id ASC
LIMIT 200

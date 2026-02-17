SELECT
  c.id,
  c.parliament_identifier,
  c.report_type_code,
  c.document_number,
  c.parliamentary_year,
  c.title,
  c.committee_name,
  c.recipient_committee,
  c.source_reference,
  c.draft_date,
  c.signature_date
FROM CommitteeReport c
WHERE
  ($query IS NULL OR (
    c.title LIKE '%' || $query || '%'
    OR c.parliament_identifier LIKE '%' || $query || '%'
    OR c.committee_name LIKE '%' || $query || '%'
    OR c.recipient_committee LIKE '%' || $query || '%'
    OR c.source_reference LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR c.parliamentary_year = $year)
ORDER BY c.draft_date DESC, c.id DESC
LIMIT $limit OFFSET $offset

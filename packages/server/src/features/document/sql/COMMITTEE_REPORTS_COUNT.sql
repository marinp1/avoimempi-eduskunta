SELECT COUNT(*) AS count
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
  AND ($sourceCommittee IS NULL OR c.committee_name = $sourceCommittee)
  AND ($recipientCommittee IS NULL OR c.recipient_committee = $recipientCommittee)
  AND ($startDate IS NULL OR COALESCE(c.signature_date, c.draft_date) >= $startDate)
  AND ($endDateExclusive IS NULL OR COALESCE(c.signature_date, c.draft_date) < $endDateExclusive)

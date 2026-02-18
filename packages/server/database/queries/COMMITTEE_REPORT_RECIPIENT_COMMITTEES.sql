SELECT
  c.recipient_committee AS committee_name,
  COUNT(*) AS count
FROM CommitteeReport c
WHERE
  c.recipient_committee IS NOT NULL
  AND c.recipient_committee != ''
  AND ($query IS NULL OR (
    c.title LIKE '%' || $query || '%'
    OR c.parliament_identifier LIKE '%' || $query || '%'
    OR c.committee_name LIKE '%' || $query || '%'
    OR c.recipient_committee LIKE '%' || $query || '%'
    OR c.source_reference LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR c.parliamentary_year = $year)
  AND ($sourceCommittee IS NULL OR c.committee_name = $sourceCommittee)
GROUP BY c.recipient_committee
ORDER BY c.recipient_committee COLLATE NOCASE ASC

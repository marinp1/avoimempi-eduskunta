SELECT COUNT(*) AS count
FROM GovernmentProposal g
WHERE
  ($query IS NULL OR (
    g.title LIKE '%' || $query || '%'
    OR g.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR g.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM GovernmentProposalSubject
    WHERE proposal_id = g.id AND subject_text = $subject
  ))

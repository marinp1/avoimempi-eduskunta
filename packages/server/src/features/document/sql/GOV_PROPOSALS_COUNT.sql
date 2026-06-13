SELECT COUNT(*) AS count
FROM GovernmentProposal g
WHERE
  ($query IS NULL OR g.id IN (
    SELECT CAST(record_id AS INTEGER)
    FROM FederatedSearchFts
    WHERE FederatedSearchFts MATCH $query
      AND type = 'government-proposal'
  ))
  AND ($year IS NULL OR g.parliamentary_year = $year)
  AND ($subject IS NULL OR EXISTS (
    SELECT 1 FROM GovernmentProposalSubject
    WHERE proposal_id = g.id AND subject_text = $subject
  ))
  AND ($startDate IS NULL OR g.submission_date >= $startDate)
  AND ($endDateExclusive IS NULL OR g.submission_date < $endDateExclusive)

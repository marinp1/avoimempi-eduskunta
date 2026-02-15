SELECT
  g.id,
  g.parliament_identifier,
  g.document_number,
  g.parliamentary_year,
  g.title,
  g.submission_date,
  g.author,
  g.decision_outcome,
  g.decision_outcome_code,
  g.latest_stage_code,
  g.end_date,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM GovernmentProposal g
LEFT JOIN GovernmentProposalSubject s ON s.proposal_id = g.id
WHERE
  ($query IS NULL OR (
    g.title LIKE '%' || $query || '%'
    OR g.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR g.parliamentary_year = $year)
GROUP BY g.id
ORDER BY g.submission_date DESC, g.id DESC
LIMIT $limit OFFSET $offset

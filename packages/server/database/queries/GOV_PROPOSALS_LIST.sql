WITH filtered AS (
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
    g.end_date
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
    AND ($startDate IS NULL OR g.submission_date >= $startDate)
    AND ($endDateExclusive IS NULL OR g.submission_date < $endDateExclusive)
  ORDER BY g.submission_date DESC, g.id DESC
  LIMIT $limit OFFSET $offset
)
SELECT
  f.id,
  f.parliament_identifier,
  f.document_number,
  f.parliamentary_year,
  f.title,
  f.submission_date,
  f.author,
  f.decision_outcome,
  f.decision_outcome_code,
  f.latest_stage_code,
  f.end_date,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM GovernmentProposalSubject s
    WHERE s.proposal_id = f.id
  ) AS subjects
FROM filtered f
ORDER BY f.submission_date DESC, f.id DESC

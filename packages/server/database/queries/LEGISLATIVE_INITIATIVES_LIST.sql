WITH filtered AS (
  SELECT
    li.id,
    li.initiative_type_code,
    li.parliament_identifier,
    li.document_number,
    li.parliamentary_year,
    li.title,
    li.submission_date,
    li.first_signer_first_name,
    li.first_signer_last_name,
    li.first_signer_party,
    li.decision_outcome,
    li.decision_outcome_code,
    li.latest_stage_code,
    li.end_date
  FROM LegislativeInitiative li
  WHERE
    ($query IS NULL OR (
      li.title LIKE '%' || $query || '%'
      OR li.parliament_identifier LIKE '%' || $query || '%'
    ))
    AND ($year IS NULL OR li.parliamentary_year = $year)
    AND ($typeCode IS NULL OR li.initiative_type_code = $typeCode)
    AND ($subject IS NULL OR EXISTS (
      SELECT 1 FROM LegislativeInitiativeSubject
      WHERE initiative_id = li.id AND subject_text = $subject
    ))
    AND ($startDate IS NULL OR li.submission_date >= $startDate)
    AND ($endDateExclusive IS NULL OR li.submission_date < $endDateExclusive)
  ORDER BY li.submission_date DESC, li.id DESC
  LIMIT $limit OFFSET $offset
)
SELECT
  f.id,
  f.initiative_type_code,
  f.parliament_identifier,
  f.document_number,
  f.parliamentary_year,
  f.title,
  f.submission_date,
  f.first_signer_first_name,
  f.first_signer_last_name,
  f.first_signer_party,
  f.decision_outcome,
  f.decision_outcome_code,
  f.latest_stage_code,
  f.end_date,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM LegislativeInitiativeSubject s
    WHERE s.initiative_id = f.id
  ) AS subjects
FROM filtered f
ORDER BY f.submission_date DESC, f.id DESC

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
  li.end_date,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM LegislativeInitiative li
LEFT JOIN LegislativeInitiativeSubject s ON s.initiative_id = li.id
WHERE
  ($query IS NULL OR (
    li.title LIKE '%' || $query || '%'
    OR li.parliament_identifier LIKE '%' || $query || '%'
  ))
  AND ($year IS NULL OR li.parliamentary_year = $year)
  AND ($typeCode IS NULL OR li.initiative_type_code = $typeCode)
GROUP BY li.id
ORDER BY li.submission_date DESC, li.id DESC
LIMIT $limit OFFSET $offset

WITH first_signer_matches AS (
  SELECT
    li.id,
    li.parliament_identifier,
    li.initiative_type_code,
    li.title,
    li.submission_date,
    li.decision_outcome,
    li.decision_outcome_code,
    li.latest_stage_code,
    li.end_date,
    'first_signer' AS relation_role,
    1 AS is_first_signer
  FROM LegislativeInitiative li
  WHERE li.first_signer_person_id = $personId
),
co_signer_matches AS (
  SELECT
    li.id,
    li.parliament_identifier,
    li.initiative_type_code,
    li.title,
    li.submission_date,
    li.decision_outcome,
    li.decision_outcome_code,
    li.latest_stage_code,
    li.end_date,
    'co_signer' AS relation_role,
    0 AS is_first_signer
  FROM LegislativeInitiativeSigner s
  JOIN LegislativeInitiative li ON li.id = s.initiative_id
  WHERE s.person_id = $personId
    AND COALESCE(s.is_first_signer, 0) = 0
)
SELECT
  u.id,
  u.parliament_identifier,
  u.initiative_type_code,
  u.title,
  u.submission_date,
  u.decision_outcome,
  u.decision_outcome_code,
  u.latest_stage_code,
  u.end_date,
  u.relation_role,
  u.is_first_signer,
  GROUP_CONCAT(s.subject_text, '||') AS subjects
FROM (
  SELECT * FROM first_signer_matches
  UNION ALL
  SELECT * FROM co_signer_matches
) u
LEFT JOIN LegislativeInitiativeSubject s ON s.initiative_id = u.id
GROUP BY u.id
ORDER BY COALESCE(u.submission_date, '') DESC, u.id DESC
LIMIT $limit;

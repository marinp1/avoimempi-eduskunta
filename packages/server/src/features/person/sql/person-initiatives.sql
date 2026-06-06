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
  id,
  parliament_identifier,
  initiative_type_code,
  title,
  submission_date,
  decision_outcome,
  decision_outcome_code,
  latest_stage_code,
  end_date,
  relation_role,
  is_first_signer,
  (
    SELECT GROUP_CONCAT(s.subject_text, '||')
    FROM LegislativeInitiativeSubject s
    WHERE s.initiative_id = id
  ) AS subjects
FROM (
  SELECT * FROM first_signer_matches
  UNION ALL
  SELECT * FROM co_signer_matches
)
ORDER BY COALESCE(submission_date, '') DESC, id DESC
LIMIT $limit;

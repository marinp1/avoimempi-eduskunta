WITH rep AS (
  SELECT
    first_name,
    last_name
  FROM Representative
  WHERE person_id = $personId
),
interpellation_matches AS (
  SELECT
    'interpellation' AS question_kind,
    i.id AS id,
    i.parliament_identifier AS parliament_identifier,
    COALESCE(i.title, i.question_text, i.parliament_identifier) AS title,
    i.submission_date AS submission_date,
    'first_signer' AS relation_role
  FROM Interpellation i
  WHERE i.first_signer_person_id = $personId

  UNION ALL

  SELECT
    'interpellation' AS question_kind,
    i.id AS id,
    i.parliament_identifier AS parliament_identifier,
    COALESCE(i.title, i.question_text, i.parliament_identifier) AS title,
    i.submission_date AS submission_date,
    'signer' AS relation_role
  FROM InterpellationSigner s
  JOIN Interpellation i ON i.id = s.interpellation_id
  WHERE s.person_id = $personId
    AND COALESCE(s.is_first_signer, 0) = 0
),
written_question_matches AS (
  SELECT
    'written_question' AS question_kind,
    wq.id AS id,
    wq.parliament_identifier AS parliament_identifier,
    COALESCE(wq.title, wq.question_text, wq.parliament_identifier) AS title,
    wq.submission_date AS submission_date,
    'first_signer' AS relation_role
  FROM WrittenQuestion wq
  WHERE wq.first_signer_person_id = $personId

  UNION ALL

  SELECT
    'written_question' AS question_kind,
    wq.id AS id,
    wq.parliament_identifier AS parliament_identifier,
    COALESCE(wq.title, wq.question_text, wq.parliament_identifier) AS title,
    wq.submission_date AS submission_date,
    'signer' AS relation_role
  FROM WrittenQuestionSigner s
  JOIN WrittenQuestion wq ON wq.id = s.question_id
  WHERE s.person_id = $personId
    AND COALESCE(s.is_first_signer, 0) = 0
)
SELECT
  question_kind,
  id,
  parliament_identifier,
  title,
  submission_date,
  relation_role
FROM (
  SELECT *
  FROM interpellation_matches

  UNION ALL

  SELECT *
  FROM written_question_matches

  UNION ALL

  SELECT
    'oral_question' AS question_kind,
    oq.id AS id,
    oq.parliament_identifier AS parliament_identifier,
    COALESCE(oq.title, oq.question_text, oq.parliament_identifier) AS title,
    oq.submission_date AS submission_date,
    'asker' AS relation_role
  FROM OralQuestion oq
  JOIN rep ON 1 = 1
  WHERE
    oq.asker_text IS NOT NULL
    AND rep.first_name IS NOT NULL
    AND rep.last_name IS NOT NULL
    AND lower(oq.asker_text) LIKE '%' || lower(rep.first_name) || '%'
    AND lower(oq.asker_text) LIKE '%' || lower(rep.last_name) || '%'
)
ORDER BY
  COALESCE(submission_date, '') DESC,
  question_kind ASC,
  id DESC
LIMIT $limit;

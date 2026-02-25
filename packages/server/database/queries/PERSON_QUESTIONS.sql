WITH rep AS (
  SELECT
    first_name,
    last_name
  FROM Representative
  WHERE person_id = $personId
)
SELECT
  question_kind,
  id,
  parliament_identifier,
  title,
  submission_date,
  relation_role
FROM (
  SELECT
    'interpellation' AS question_kind,
    i.id AS id,
    i.parliament_identifier AS parliament_identifier,
    COALESCE(i.title, i.question_text, i.parliament_identifier) AS title,
    i.submission_date AS submission_date,
    CASE
      WHEN i.first_signer_person_id = $personId THEN 'first_signer'
      ELSE 'signer'
    END AS relation_role
  FROM Interpellation i
  WHERE
    i.first_signer_person_id = $personId
    OR EXISTS (
      SELECT 1
      FROM InterpellationSigner s
      WHERE
        s.interpellation_id = i.id
        AND s.person_id = $personId
    )

  UNION ALL

  SELECT
    'written_question' AS question_kind,
    wq.id AS id,
    wq.parliament_identifier AS parliament_identifier,
    COALESCE(wq.title, wq.question_text, wq.parliament_identifier) AS title,
    wq.submission_date AS submission_date,
    CASE
      WHEN wq.first_signer_person_id = $personId THEN 'first_signer'
      ELSE 'signer'
    END AS relation_role
  FROM WrittenQuestion wq
  WHERE
    wq.first_signer_person_id = $personId
    OR EXISTS (
      SELECT 1
      FROM WrittenQuestionSigner s
      WHERE
        s.question_id = wq.id
        AND s.person_id = $personId
    )

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

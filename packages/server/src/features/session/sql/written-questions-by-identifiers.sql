WITH identifiers AS (
  SELECT value AS identifier
  FROM json_each($identifiersJson)
)
SELECT
  wq.id,
  wq.parliament_identifier,
  wq.document_number,
  wq.parliamentary_year,
  wq.title,
  wq.submission_date,
  wq.first_signer_person_id,
  wq.first_signer_first_name,
  wq.first_signer_last_name,
  wq.first_signer_party,
  wq.co_signer_count,
  wq.answer_minister_title,
  wq.answer_minister_first_name,
  wq.answer_minister_last_name,
  wq.answer_date,
  wq.decision_outcome,
  wq.decision_outcome_code,
  wq.question_text,
  wq.question_rich_text
FROM WrittenQuestion wq
JOIN identifiers i ON wq.parliament_identifier = i.identifier

SELECT
  q.id,
  q.parliament_identifier,
  q.document_number,
  q.parliamentary_year,
  q.title,
  q.submission_date,
  q.first_signer_person_id,
  q.first_signer_first_name,
  q.first_signer_last_name,
  q.first_signer_party,
  q.co_signer_count,
  q.question_text,
  q.question_rich_text,
  q.answer_parliament_identifier,
  q.answer_minister_title,
  q.answer_minister_first_name,
  q.answer_minister_last_name,
  q.answer_date,
  q.decision_outcome,
  q.decision_outcome_code,
  q.latest_stage_code,
  q.end_date,
  r.body_text AS response_body_text
FROM WrittenQuestion q
LEFT JOIN WrittenQuestionResponse r ON r.question_id = q.id
WHERE q.id = $id

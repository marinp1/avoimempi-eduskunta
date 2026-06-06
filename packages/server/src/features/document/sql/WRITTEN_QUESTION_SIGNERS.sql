SELECT
  question_id,
  signer_order,
  person_id,
  first_name,
  last_name,
  party,
  is_first_signer
FROM WrittenQuestionSigner
WHERE question_id = $questionId
ORDER BY signer_order

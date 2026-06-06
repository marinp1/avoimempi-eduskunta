SELECT
  question_id,
  subject_text,
  yso_uri
FROM OralQuestionSubject
WHERE question_id = $questionId
ORDER BY subject_text ASC

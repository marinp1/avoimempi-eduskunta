SELECT
  question_id,
  subject_text
FROM WrittenQuestionSubject
WHERE question_id = $questionId

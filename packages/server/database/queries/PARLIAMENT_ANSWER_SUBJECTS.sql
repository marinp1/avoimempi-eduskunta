SELECT
  answer_id,
  subject_order,
  subject_text
FROM ParliamentAnswerSubject
WHERE answer_id = $answerId
ORDER BY subject_order ASC

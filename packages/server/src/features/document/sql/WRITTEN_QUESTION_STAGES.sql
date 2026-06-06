SELECT
  question_id,
  stage_order,
  stage_title,
  stage_code,
  event_date,
  event_title,
  event_description
FROM WrittenQuestionStage
WHERE question_id = $questionId
ORDER BY stage_order

SELECT s.subject_text
FROM WrittenQuestionResponseSubject s
JOIN WrittenQuestionResponse r ON r.id = s.response_id
WHERE r.question_id = $questionId

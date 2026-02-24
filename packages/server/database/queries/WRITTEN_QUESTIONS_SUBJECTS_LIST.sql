SELECT subject_text, COUNT(*) AS count
FROM WrittenQuestionSubject
GROUP BY subject_text
ORDER BY count DESC, subject_text ASC

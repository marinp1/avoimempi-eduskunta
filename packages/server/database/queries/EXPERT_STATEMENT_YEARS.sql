SELECT DISTINCT substr(meeting_date, 1, 4) AS year
FROM ExpertStatement
WHERE meeting_date IS NOT NULL
ORDER BY year DESC

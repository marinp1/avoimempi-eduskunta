SELECT
    TRIM(government) AS government,
    MIN(start_date) AS start_date,
    CASE
        WHEN SUM(CASE WHEN end_date IS NULL THEN 1 ELSE 0 END) > 0 THEN NULL
        ELSE MAX(end_date)
    END AS end_date
FROM GovernmentMembership
WHERE government IS NOT NULL
    AND TRIM(government) <> ''
    AND start_date IS NOT NULL
GROUP BY TRIM(government)
ORDER BY start_date DESC, government ASC

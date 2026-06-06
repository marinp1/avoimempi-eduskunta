SELECT
    pgm.group_code AS party_code,
    COUNT(DISTINCT pgm.person_id) AS seat_count,
    COALESCE(MAX(gg.in_gov), 0) AS is_in_government
FROM ParliamentaryGroupMembership pgm
JOIN Term t ON t.person_id = pgm.person_id
    AND t.start_date <= $date
    AND (t.end_date IS NULL OR t.end_date >= $date)
LEFT JOIN (
    SELECT DISTINCT pgm2.group_code, 1 AS in_gov
    FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    JOIN ParliamentaryGroupMembership pgm2 ON pgm2.person_id = gm.person_id
        AND pgm2.start_date <= $date
        AND (pgm2.end_date IS NULL OR pgm2.end_date >= $date)
    WHERE gm.start_date <= $date
        AND (gm.end_date IS NULL OR gm.end_date >= $date)
        AND g.start_date <= $date
        AND (g.end_date IS NULL OR g.end_date >= $date)
) gg ON gg.group_code = pgm.group_code
WHERE pgm.start_date <= $date
    AND (pgm.end_date IS NULL OR pgm.end_date >= $date)
GROUP BY pgm.group_code
ORDER BY seat_count DESC;

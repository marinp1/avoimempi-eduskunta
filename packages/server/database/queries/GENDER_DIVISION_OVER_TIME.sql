WITH RECURSIVE YearSeries AS (
    SELECT MIN(start_year) AS year
    FROM Term
    UNION ALL
    SELECT year + 1
    FROM YearSeries
    WHERE year < (SELECT MAX(start_year) FROM Term)
),
ActiveRepsByYear AS (
    SELECT
        ys.year,
        r.person_id,
        r.gender
    FROM YearSeries ys
    JOIN Term t ON t.start_year <= ys.year
      AND (t.end_year IS NULL OR t.end_year >= ys.year)
    JOIN Representative r ON r.person_id = t.person_id
    WHERE r.gender IN ('Mies', 'Nainen')
    GROUP BY ys.year, r.person_id
)
SELECT
    year,
    SUM(CASE WHEN gender = 'Nainen' THEN 1 ELSE 0 END) AS female_count,
    SUM(CASE WHEN gender = 'Mies' THEN 1 ELSE 0 END) AS male_count,
    COUNT(*) AS total_count,
    ROUND(CAST(SUM(CASE WHEN gender = 'Nainen' THEN 1 ELSE 0 END) AS REAL) * 100.0 / COUNT(*), 2) AS female_percentage,
    ROUND(CAST(SUM(CASE WHEN gender = 'Mies' THEN 1 ELSE 0 END) AS REAL) * 100.0 / COUNT(*), 2) AS male_percentage
FROM ActiveRepsByYear
GROUP BY year
ORDER BY year ASC

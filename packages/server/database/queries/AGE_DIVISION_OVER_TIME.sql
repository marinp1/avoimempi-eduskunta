WITH RECURSIVE YearSeries AS (
    SELECT MIN(CAST(SUBSTR(start_date, 1, 4) AS INTEGER)) AS year
    FROM Term
    UNION ALL
    SELECT year + 1
    FROM YearSeries
    WHERE year < (SELECT MAX(CAST(SUBSTR(start_date, 1, 4) AS INTEGER)) FROM Term)
),
ActiveRepsByYear AS (
    SELECT
        ys.year,
        r.person_id,
        r.birth_date,
        CASE
            WHEN r.birth_date != '' THEN
                ys.year - CAST(SUBSTR(r.birth_date, 1, 4) AS INTEGER)
            ELSE NULL
        END AS age
    FROM YearSeries ys
    CROSS JOIN Representative r
    JOIN Term t ON r.person_id = t.person_id
    WHERE CAST(SUBSTR(t.start_date, 1, 4) AS INTEGER) <= ys.year
      AND (t.end_date = '' OR CAST(SUBSTR(t.end_date, 1, 4) AS INTEGER) >= ys.year)
      AND r.birth_date != ''
    GROUP BY ys.year, r.person_id
)
SELECT
    year,
    SUM(CASE WHEN age < 30 THEN 1 ELSE 0 END) AS age_under_30,
    SUM(CASE WHEN age >= 30 AND age < 40 THEN 1 ELSE 0 END) AS age_30_39,
    SUM(CASE WHEN age >= 40 AND age < 50 THEN 1 ELSE 0 END) AS age_40_49,
    SUM(CASE WHEN age >= 50 AND age < 60 THEN 1 ELSE 0 END) AS age_50_59,
    SUM(CASE WHEN age >= 60 THEN 1 ELSE 0 END) AS age_60_plus,
    ROUND(AVG(age), 1) AS average_age,
    MIN(age) AS min_age,
    MAX(age) AS max_age,
    COUNT(*) AS total_count
FROM ActiveRepsByYear
GROUP BY year
ORDER BY year ASC

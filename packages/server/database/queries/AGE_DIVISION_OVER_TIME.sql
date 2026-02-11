WITH RECURSIVE bounds AS (
    SELECT
        MIN(start_year) AS min_year,
        MAX(start_year) AS max_year
    FROM Term
),
YearSeries AS (
    SELECT min_year AS year
    FROM bounds
    UNION ALL
    SELECT year + 1
    FROM YearSeries
    WHERE year < (SELECT max_year FROM bounds)
),
ActiveTermsByYear AS (
    SELECT
        ys.year,
        t.person_id
    FROM YearSeries ys
    JOIN Term t ON t.start_year <= ys.year
      AND (t.end_year IS NULL OR t.end_year >= ys.year)
    GROUP BY ys.year, t.person_id
),
ActiveRepsByYear AS (
    SELECT
        aty.year,
        r.person_id,
        aty.year - CAST(SUBSTR(r.birth_date, 1, 4) AS INTEGER) AS age
    FROM ActiveTermsByYear aty
    JOIN Representative r ON r.person_id = aty.person_id
    WHERE r.birth_date IS NOT NULL
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

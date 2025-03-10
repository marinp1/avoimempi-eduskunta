-- Create function to get a list of months from 1907-01-01 to the current date (or one given as function)

CREATE OR REPLACE FUNCTION public.getmonths(
    end_date date DEFAULT date_trunc('month', CURRENT_DATE)
)
RETURNS TABLE(date date)
LANGUAGE plpgsql
AS $$BEGIN
    RETURN QUERY
    SELECT generate_series('1907-01-01'::DATE, end_date, '1 month')::DATE AS date;
END;$$;

-- Create cached view for parliament composition

CREATE MATERIALIZED VIEW statistics_composition_gender AS
WITH monthly_dates AS (
    SELECT date
    FROM getmonths()
),
parliament_composition AS (
    SELECT
        md.date,
        pc.person_id,
        pc.gender
    FROM
        monthly_dates md
    CROSS JOIN LATERAL getparliamentcomposition(md.date) pc
)
SELECT
    date,
    COUNT(*) AS total_rows,
    COUNT(CASE WHEN gender = 'Nainen' THEN 1 END) AS number_of_women,
    COUNT(CASE WHEN gender = 'Mies' THEN 1 END) AS number_of_men
FROM
    parliament_composition
GROUP BY
    date
ORDER BY
    date;
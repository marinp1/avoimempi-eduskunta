-- Create index on term.start_date
CREATE INDEX idx_term_start_date ON term(start_date);
-- Create index on term.end_date
CREATE INDEX idx_term_end_date ON term(end_date);
-- Create index on temporaryabsences.start_date
CREATE INDEX idx_temporaryabsence_start_date ON temporaryabsence(start_date);
-- Create index on temporaryabsences.end_date
CREATE INDEX idx_temporaryabsence_end_date ON temporaryabsence(end_date);

REINDEX TABLE term;
REINDEX TABLE temporaryabsence;

-- Create a database function to get the parliament composition
CREATE OR REPLACE FUNCTION public.getParliamentComposition(datestr DATE)
RETURNS TABLE (
    person_id INT,
    last_name VARCHAR,
    first_name VARCHAR,
    sort_name VARCHAR,
    gender VARCHAR,
    birth_date DATE,
    birth_place VARCHAR,
    death_date DATE,
    death_place VARCHAR,
    profession VARCHAR,
    t_start_date DATE,
    t_end_date DATE
) AS $$
BEGIN
    RETURN QUERY
SELECT
    r.person_id,
    r.last_name,
    r.first_name,
    r.sort_name,
    r.gender,
    r.birth_date,
    r.birth_place,
    r.death_date,
    r.death_place,
    r.profession,
    t.start_date AS t_start_date,
    t.end_date AS t_end_date
FROM
    public.representative r
JOIN
    public.term t ON r.person_id = t.person_id
WHERE
    t.start_date <= datestr
    AND (t.end_date IS NULL OR t.end_date >= datestr)
    AND NOT EXISTS (
        SELECT 1
        FROM public.temporaryabsence ta
        WHERE ta.person_id = r.person_id
          AND ta.start_date <= datestr
          AND (ta.end_date IS NULL OR ta.end_date >= datestr)
    );
END;
$$ LANGUAGE plpgsql;

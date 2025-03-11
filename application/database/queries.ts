export const sql = String.raw;

export const currentComposition = sql`
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
    representative r
JOIN
    term t ON r.person_id = t.person_id
WHERE
    t.start_date <= $date
    AND (t.end_date IS NULL OR t.end_date >= $date)
    AND NOT EXISTS (
        SELECT 1
        FROM temporaryabsence ta
        WHERE ta.person_id = r.person_id
          AND ta.start_date <= $date
          AND (ta.end_date IS NULL OR ta.end_date >= $date)
    )
    `;

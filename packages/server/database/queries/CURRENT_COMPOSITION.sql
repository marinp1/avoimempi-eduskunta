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
    t.end_date AS t_end_date,
    pgm.group_name AS party_name,
    CASE
        WHEN pgm.group_name IN (
            SELECT DISTINCT pgm2.group_name
            FROM GovernmentMembership gm
            JOIN Representative r2 ON gm.person_id = r2.person_id
            JOIN ParliamentaryGroupMembership pgm2 ON r2.person_id = pgm2.person_id
            WHERE gm.start_date <= $date
              AND (gm.end_date IS NULL OR gm.end_date >= $date)
              AND pgm2.start_date <= $date
              AND (pgm2.end_date IS NULL OR pgm2.end_date >= $date)
        ) THEN 1
        ELSE 0
    END AS is_in_government
FROM
    representative r
JOIN
    term t ON r.person_id = t.person_id
LEFT JOIN
    ParliamentaryGroupMembership pgm ON r.person_id = pgm.person_id
    AND pgm.start_date <= $date
    AND (pgm.end_date IS NULL OR pgm.end_date >= $date)
WHERE
    t.start_date <= $date
    AND (t.end_date IS NULL OR t.end_date >= $date)
    AND NOT EXISTS (
        SELECT 1
        FROM temporaryabsence ta
        WHERE ta.person_id = r.person_id
          AND ta.start_date <= $date
          AND (ta.end_date IS NULL OR ta.end_date >= $date)
    );

WITH government_groups AS (
    SELECT DISTINCT
        pgm.group_name
    FROM GovernmentMembership gm
    JOIN Government g ON g.id = gm.government_id
    JOIN ParliamentaryGroupMembership pgm ON gm.person_id = pgm.person_id
    WHERE g.start_date <= $date
      AND (g.end_date IS NULL OR g.end_date >= $date)
      AND gm.start_date <= $date
      AND (gm.end_date IS NULL OR gm.end_date >= $date)
      AND pgm.start_date <= $date
      AND (pgm.end_date IS NULL OR pgm.end_date >= $date)
)
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
        WHEN gg.group_name IS NOT NULL THEN 1
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
LEFT JOIN
    government_groups gg ON gg.group_name = pgm.group_name
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

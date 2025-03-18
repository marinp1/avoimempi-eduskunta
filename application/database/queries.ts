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
    AND (t.end_date = '' OR t.end_date >= $date)
    AND NOT EXISTS (
        SELECT 1
        FROM temporaryabsence ta
        WHERE ta.person_id = r.person_id
          AND ta.start_date <= $date
          AND (ta.end_date = '' OR ta.end_date >= $date)
    )
    `;

export const votesByPerson = sql`
SELECT
    vs.*,
    v.vote,
    v.group_abbrviation
FROM
    Voting vs
JOIN
    Vote v ON vs.id = v.voting_id
JOIN
    Representative r on r.person_id = v.person_id
WHERE
    r.person_id = $personId
ORDER BY vs.start_time ASC
`;

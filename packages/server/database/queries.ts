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
    t.end_date AS t_end_date,
    pgm.group_name AS party_name,
    CASE
        WHEN pgm.group_name IN (
            SELECT DISTINCT pgm2.group_name
            FROM GovernmentMembership gm
            JOIN Representative r2 ON gm.person_id = r2.person_id
            JOIN ParliamentaryGroupMembership pgm2 ON r2.person_id = pgm2.person_id
            WHERE gm.start_date <= $date
              AND (gm.end_date = '' OR gm.end_date >= $date)
              AND pgm2.start_date <= $date
              AND (pgm2.end_date = '' OR pgm2.end_date >= $date)
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
    AND (pgm.end_date = '' OR pgm.end_date >= $date)
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
ORDER BY vs.start_time DESC
`;

export const representativeDetails = sql`
SELECT
    r.*
FROM
    Representative r
WHERE
    r.person_id = $personId
`;

export const representativeDistricts = sql`
SELECT
    rd.id,
    rd.person_id,
    d.name as district_name,
    rd.start_date,
    rd.end_date
FROM
    RepresentativeDistrict rd
JOIN
    District d ON rd.district_code = d.code
WHERE
    rd.person_id = $personId
ORDER BY rd.start_date DESC
`;

export const leavingParliamentRecords = sql`
SELECT
    plp.*
FROM
    LeavingParliament plp
WHERE
    plp.person_id = $personId
ORDER BY plp.end_date DESC
`;

export const trustPositions = sql`
SELECT
    tp.*
FROM
    TrustPosition tp
WHERE
    tp.person_id = $personId
ORDER BY tp.period ASC
`;

export const governmentMemberships = sql`
SELECT
    gm.*
FROM
    GovernmentMembership gm
WHERE
    gm.person_id = $personId
ORDER BY gm.start_date DESC
`;

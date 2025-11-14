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
    PeopleLeavingParliament plp
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

export const sessions = sql`
SELECT
    s.id,
    s.number,
    s.key,
    s.date,
    s.year,
    s.type,
    s.state,
    s.description,
    s.start_time_actual,
    s.start_time_reported,
    s.agenda_key,
    a.title as agenda_title,
    a.state as agenda_state
FROM
    Session s
LEFT JOIN
    Agenda a ON s.agenda_key = a.key
ORDER BY s.date DESC, s.number DESC
LIMIT 100
`;

export const sessionsPaginated = sql`
SELECT
    s.id,
    s.number,
    s.key,
    s.date,
    s.year,
    s.type,
    s.state,
    s.description,
    s.start_time_actual,
    s.start_time_reported,
    s.agenda_key,
    a.title as agenda_title,
    a.state as agenda_state
FROM
    Session s
LEFT JOIN
    Agenda a ON s.agenda_key = a.key
ORDER BY s.date DESC, s.number DESC
LIMIT $limit OFFSET $offset
`;

export const sessionSections = sql`
SELECT
    sec.id,
    sec.key,
    sec.identifier,
    sec.title,
    sec.ordinal,
    sec.note,
    sec.processing_title,
    sec.resolution,
    sec.session_key,
    sec.agenda_key,
    sec.modified_datetime,
    sec.vaski_id
FROM
    Section sec
WHERE
    sec.session_key = $sessionKey
ORDER BY sec.ordinal ASC
`;

export const sectionSpeeches = sql`
SELECT
    sp.id,
    sp.key,
    sp.session_key,
    sp.section_key,
    sp.ordinal,
    sp.ordinal_number,
    sp.speech_type,
    sp.request_method,
    sp.request_time,
    sp.person_id,
    sp.first_name,
    sp.last_name,
    sp.gender,
    sp.party_abbreviation,
    sp.has_spoken,
    sp.ministry,
    sp.modified_datetime,
    sp.excel_key,
    es.content,
    es.start_time,
    es.end_time,
    es.minutes_url
FROM
    Speech sp
LEFT JOIN
    ExcelSpeech es ON sp.excel_key = es.excel_id
WHERE
    sp.section_key = $sectionKey
ORDER BY sp.ordinal ASC
`;

export const votingParticipation = sql`
SELECT
    r.person_id,
    r.first_name,
    r.last_name,
    r.sort_name,
    t.start_date AS term_start,
    t.end_date AS term_end,
     COUNT(CASE WHEN TRIM(v.vote) != 'Poissa' THEN 1 END) AS votes_cast,
    COUNT(*) AS total_votings,
    ROUND(
        CAST(COUNT(CASE WHEN TRIM(v.vote) != 'Poissa' THEN 1 END) AS REAL) * 100.0 /
        NULLIF(COUNT(*), 0),
        2
    ) AS participation_rate
FROM
    Representative r
JOIN
    Term t ON r.person_id = t.person_id
JOIN
    Vote v ON r.person_id = v.person_id
JOIN
    Voting vt ON vt.id = v.voting_id
    AND DATE(vt.start_time) >= t.start_date
    AND (t.end_date = '' OR DATE(vt.start_time) <= t.end_date)
    AND (CAST($startDate AS TEXT) = '' OR DATE(vt.start_time) >= $startDate)
    AND (CAST($endDate AS TEXT) = '' OR DATE(vt.start_time) <= $endDate)
WHERE
    (CAST($personId AS TEXT) = '' OR r.person_id = $personId)
    AND (
        (CAST($startDate AS TEXT) = '' AND CAST($endDate AS TEXT) = '')
        OR (t.start_date <= COALESCE($endDate, DATE('now'))
            AND (t.end_date = '' OR t.end_date >= COALESCE($startDate, t.start_date)))
    )
GROUP BY
    r.person_id, t.id, t.start_date, t.end_date
HAVING
    COUNT(*) > 0
ORDER BY
    participation_rate DESC, votes_cast DESC
`;

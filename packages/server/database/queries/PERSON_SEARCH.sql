WITH term_summary AS (
    SELECT
        t.person_id,
        MIN(t.start_date) AS first_term_start,
        MAX(t.end_date) AS last_term_end,
        MAX(CASE
            WHEN t.end_date IS NULL THEN DATE('now')
            ELSE t.end_date
        END) AS latest_active_date,
        MAX(CASE
            WHEN t.start_date <= DATE('now')
             AND (t.end_date IS NULL OR t.end_date >= DATE('now')) THEN 1
            ELSE 0
        END) AS is_current_mp,
        MAX(CASE
            WHEN $date IS NOT NULL
             AND t.start_date <= $date
             AND (t.end_date IS NULL OR t.end_date >= $date) THEN 1
            ELSE 0
        END) AS is_active_on_selected_date
    FROM Term t
    GROUP BY t.person_id
),
latest_group AS (
    SELECT
        ranked.person_id,
        ranked.group_name AS latest_party_name
    FROM (
        SELECT
            pgm.person_id,
            pgm.group_name,
            ROW_NUMBER() OVER (
                PARTITION BY pgm.person_id
                ORDER BY
                    CASE WHEN pgm.end_date IS NULL THEN 1 ELSE 0 END DESC,
                    COALESCE(pgm.end_date, '9999-12-31') DESC,
                    pgm.start_date DESC,
                    pgm.id DESC
            ) AS row_num
        FROM ParliamentaryGroupMembership pgm
    ) ranked
    WHERE ranked.row_num = 1
),
matches AS (
    SELECT
        r.person_id,
        r.first_name,
        r.last_name,
        r.sort_name,
        r.birth_date,
        r.death_date,
        r.profession,
        lg.latest_party_name,
        ts.first_term_start,
        ts.last_term_end,
        ts.latest_active_date,
        COALESCE(ts.is_current_mp, 0) AS is_current_mp,
        COALESCE(ts.is_active_on_selected_date, 0) AS is_active_on_selected_date,
        CASE
            WHEN r.sort_name = $exactQuery THEN 0
            WHEN (r.first_name || ' ' || r.last_name) = $exactQuery THEN 1
            WHEN r.sort_name LIKE $prefixQuery COLLATE NOCASE THEN 2
            WHEN (r.first_name || ' ' || r.last_name) LIKE $prefixQuery COLLATE NOCASE THEN 3
            WHEN r.last_name LIKE $prefixQuery COLLATE NOCASE THEN 4
            ELSE 5
        END AS match_rank
    FROM Representative r
    LEFT JOIN term_summary ts ON ts.person_id = r.person_id
    LEFT JOIN latest_group lg ON lg.person_id = r.person_id
    WHERE
        r.sort_name LIKE '%' || $query || '%' COLLATE NOCASE
        OR (r.first_name || ' ' || r.last_name) LIKE '%' || $query || '%' COLLATE NOCASE
        OR (r.last_name || ' ' || r.first_name) LIKE '%' || $query || '%' COLLATE NOCASE
        OR r.first_name LIKE '%' || $query || '%' COLLATE NOCASE
        OR r.last_name LIKE '%' || $query || '%' COLLATE NOCASE
)
SELECT
    person_id,
    first_name,
    last_name,
    sort_name,
    birth_date,
    death_date,
    profession,
    latest_party_name,
    first_term_start,
    last_term_end,
    latest_active_date,
    is_current_mp,
    is_active_on_selected_date
FROM matches
ORDER BY
    match_rank ASC,
    is_current_mp DESC,
    COALESCE(latest_active_date, '0000-01-01') DESC,
    sort_name ASC,
    person_id ASC
LIMIT $limit

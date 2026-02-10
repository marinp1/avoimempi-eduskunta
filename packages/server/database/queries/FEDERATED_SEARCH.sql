SELECT 'mp' AS type, r.person_id AS id, r.first_name || ' ' || r.last_name AS title, r.party AS subtitle, NULL AS date
FROM Representative r
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
WHERE r.first_name || ' ' || r.last_name LIKE '%' || $q || '%'
   OR r.last_name LIKE '%' || $q || '%'

UNION ALL

SELECT 'voting' AS type, CAST(v.id AS TEXT) AS id, COALESCE(v.section_title, v.title) AS title, 'Jaa: ' || v.n_yes || ' / Ei: ' || v.n_no AS subtitle, v.start_time AS date
FROM Voting v
WHERE v.section_title LIKE '%' || $q || '%' OR v.title LIKE '%' || $q || '%'

UNION ALL

SELECT 'document' AS type, CAST(d.id AS TEXT) AS id, d.title AS title, d.eduskunta_tunnus AS subtitle, d.created AS date
FROM VaskiDocument d
WHERE d.title LIKE '%' || $q || '%' OR d.eduskunta_tunnus LIKE '%' || $q || '%'

ORDER BY date DESC
LIMIT $limit;

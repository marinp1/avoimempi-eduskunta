SELECT 'mp' AS type, r.person_id AS id, r.first_name || ' ' || r.last_name AS title, r.party AS subtitle, NULL AS date
FROM Representative r
JOIN Term t ON r.person_id = t.person_id AND t.end_date IS NULL
WHERE
  (r.first_name || ' ' || r.last_name) LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(r.last_name, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(r.party, '') LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'voting' AS type, CAST(v.id AS TEXT) AS id, COALESCE(v.section_title, v.title) AS title, 'Jaa: ' || v.n_yes || ' / Ei: ' || v.n_no AS subtitle, v.start_time AS date
FROM Voting v
WHERE
  COALESCE(v.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(v.section_title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(v.main_section_title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(v.agenda_title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(v.section_processing_title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(v.session_key, '') LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'interpellation' AS type, CAST(i.id AS TEXT) AS id, COALESCE(i.title, i.parliament_identifier) AS title, i.parliament_identifier AS subtitle, i.submission_date AS date
FROM Interpellation i
WHERE
  COALESCE(i.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR i.parliament_identifier LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'government-proposal' AS type, CAST(g.id AS TEXT) AS id, COALESCE(g.title, g.parliament_identifier) AS title, g.parliament_identifier AS subtitle, g.submission_date AS date
FROM GovernmentProposal g
WHERE
  COALESCE(g.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR g.parliament_identifier LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'written-question' AS type, CAST(wq.id AS TEXT) AS id, COALESCE(wq.title, wq.parliament_identifier) AS title, wq.parliament_identifier AS subtitle, wq.submission_date AS date
FROM WrittenQuestion wq
WHERE
  COALESCE(wq.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR wq.parliament_identifier LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'oral-question' AS type, CAST(oq.id AS TEXT) AS id, COALESCE(oq.title, oq.parliament_identifier) AS title, oq.parliament_identifier AS subtitle, oq.submission_date AS date
FROM OralQuestion oq
WHERE
  COALESCE(oq.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR COALESCE(oq.question_text, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR oq.parliament_identifier LIKE '%' || $q || '%' COLLATE NOCASE

UNION ALL

SELECT 'legislative-initiative' AS type, CAST(li.id AS TEXT) AS id, COALESCE(li.title, li.parliament_identifier) AS title, li.parliament_identifier AS subtitle, li.submission_date AS date
FROM LegislativeInitiative li
WHERE
  COALESCE(li.title, '') LIKE '%' || $q || '%' COLLATE NOCASE
  OR li.parliament_identifier LIKE '%' || $q || '%' COLLATE NOCASE

ORDER BY date DESC
LIMIT $limit;

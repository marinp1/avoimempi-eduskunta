WITH target_documents AS (
  SELECT DISTINCT dr.document_tunnus
  FROM SaliDBDocumentReference dr
  WHERE dr.voting_id = $id
    AND dr.document_tunnus IS NOT NULL
    AND dr.document_tunnus != ''
),
related_by_document AS (
  SELECT DISTINCT dr.voting_id
  FROM SaliDBDocumentReference dr
  JOIN target_documents td ON td.document_tunnus = dr.document_tunnus
  WHERE dr.voting_id IS NOT NULL
    AND dr.voting_id != $id
),
related_by_section AS (
  SELECT v2.id AS voting_id
  FROM Voting v2
  JOIN Voting v1 ON v1.id = $id
  WHERE v2.section_key IS NOT NULL
    AND v2.section_key = v1.section_key
    AND v2.id != $id
),
all_related AS (
  SELECT voting_id FROM related_by_document
  UNION
  SELECT voting_id FROM related_by_section
)
SELECT
  v.id,
  v.number,
  v.start_time,
  COALESCE(
    NULLIF(v.section_title, ''),
    NULLIF(v.main_section_title, ''),
    NULLIF(v.agenda_title, ''),
    NULLIF(v.title, ''),
    '(ei otsikkoa)'
  ) AS context_title,
  v.n_yes,
  v.n_no,
  v.n_abstain,
  v.n_absent,
  v.n_total,
  v.session_key
FROM all_related ar
JOIN Voting v ON v.id = ar.voting_id
ORDER BY v.start_time ASC, v.id ASC
LIMIT 25

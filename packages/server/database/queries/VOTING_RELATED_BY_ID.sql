WITH target_documents AS (
  SELECT DISTINCT dr.document_tunnus
  FROM SaliDBDocumentReference dr
  WHERE dr.voting_id = $id
    AND dr.document_tunnus IS NOT NULL
    AND dr.document_tunnus != ''
),
related_votings AS (
  SELECT DISTINCT dr.voting_id
  FROM SaliDBDocumentReference dr
  JOIN target_documents td ON td.document_tunnus = dr.document_tunnus
  WHERE dr.voting_id IS NOT NULL
    AND dr.voting_id != $id
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
FROM related_votings rv
JOIN Voting v ON v.id = rv.voting_id
ORDER BY v.start_time ASC, v.id ASC
LIMIT 25

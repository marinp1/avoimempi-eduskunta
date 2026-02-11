WITH session_sections AS (
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
    sec.vaski_id,
    sec.document_id,
    sec.document_tunnus
  FROM Section sec
  WHERE sec.session_key = $sessionKey
),
speech_stats AS (
  SELECT
    sp.section_key,
    COUNT(*) AS speech_count,
    COUNT(DISTINCT sp.person_id) AS speaker_count,
    COUNT(DISTINCT CASE WHEN sp.party_abbreviation IS NOT NULL THEN sp.party_abbreviation END) AS party_count
  FROM Speech sp
  JOIN session_sections ss ON ss.key = sp.section_key
  GROUP BY sp.section_key
),
voting_stats AS (
  SELECT
    v.section_key,
    COUNT(*) AS voting_count
  FROM Voting v
  JOIN session_sections ss ON ss.key = v.section_key
  GROUP BY v.section_key
),
selected_docs AS (
  SELECT
    ss.id AS section_id,
    COALESCE(ss.document_id, s.minutes_document_id) AS document_id
  FROM session_sections ss
  JOIN Session s ON s.key = ss.session_key
),
doc_ids AS (
  SELECT DISTINCT document_id AS id
  FROM selected_docs
  WHERE document_id IS NOT NULL
),
authors AS (
  SELECT
    ranked.document_id,
    ranked.first_name,
    ranked.last_name,
    ranked.position_text,
    ranked.organization_text
  FROM (
    SELECT
      da.document_id,
      da.first_name,
      da.last_name,
      da.position_text,
      da.organization_text,
      ROW_NUMBER() OVER (PARTITION BY da.document_id ORDER BY da.id ASC) AS rn
    FROM DocumentActor da
    WHERE LOWER(da.role_code) = 'laatija'
      AND da.document_id IN (SELECT id FROM doc_ids)
  ) ranked
  WHERE ranked.rn = 1
),
source_refs AS (
  SELECT
    ranked.document_id,
    ranked.target_tunnus AS target_eduskunta_tunnus
  FROM (
    SELECT
      dr.document_id,
      dr.target_tunnus,
      ROW_NUMBER() OVER (PARTITION BY dr.document_id ORDER BY dr.id ASC) AS rn
    FROM DocumentRelation dr
    WHERE dr.relation_type = 'vireilletulo'
      AND dr.document_id IN (SELECT id FROM doc_ids)
  ) ranked
  WHERE ranked.rn = 1
),
subjects AS (
  SELECT
    src.document_id,
    GROUP_CONCAT(src.subject_text, ' | ') AS vaski_subjects
  FROM (
    SELECT DISTINCT
      ds.document_id,
      ds.subject_text
    FROM DocumentSubject ds
    WHERE ds.document_id IN (SELECT id FROM doc_ids)
  ) src
  GROUP BY src.document_id
)
SELECT
  ss.id,
  ss.key,
  ss.identifier,
  ss.title,
  ss.ordinal,
  ss.note,
  ss.processing_title,
  ss.resolution,
  ss.session_key,
  ss.agenda_key,
  ss.modified_datetime,
  ss.vaski_id,
  d.type_name_fi AS vaski_document_type_name,
  d.document_type_code AS vaski_document_type_code,
  d.eduskunta_tunnus AS vaski_eduskunta_tunnus,
  CASE
    WHEN d.document_number_text GLOB '[0-9]*' THEN CAST(d.document_number_text AS INTEGER)
    ELSE NULL
  END AS vaski_document_number,
  d.parliamentary_year_text AS vaski_parliamentary_year,
  d.title AS vaski_title,
  NULL AS vaski_summary,
  a.first_name AS vaski_author_first_name,
  a.last_name AS vaski_author_last_name,
  a.position_text AS vaski_author_role,
  a.organization_text AS vaski_author_organization,
  d.created_at AS vaski_creation_date,
  d.status_text AS vaski_status,
  sr.target_eduskunta_tunnus AS vaski_source_reference,
  sub.vaski_subjects,
  COALESCE(vs.voting_count, 0) AS voting_count,
  COALESCE(sps.speech_count, 0) AS speech_count,
  COALESCE(sps.speaker_count, 0) AS speaker_count,
  COALESCE(sps.party_count, 0) AS party_count
FROM session_sections ss
LEFT JOIN selected_docs sd ON sd.section_id = ss.id
LEFT JOIN Document d ON d.id = sd.document_id
LEFT JOIN authors a ON a.document_id = d.id
LEFT JOIN source_refs sr ON sr.document_id = d.id
LEFT JOIN subjects sub ON sub.document_id = d.id
LEFT JOIN voting_stats vs ON vs.section_key = ss.key
LEFT JOIN speech_stats sps ON sps.section_key = ss.key
ORDER BY ss.ordinal ASC

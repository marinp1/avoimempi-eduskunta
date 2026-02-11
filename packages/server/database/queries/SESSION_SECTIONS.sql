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
    sec.vaski_id
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
doc_ids AS (
  SELECT DISTINCT vaski_id AS id
  FROM session_sections
  WHERE vaski_id IS NOT NULL
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
      va.document_id,
      va.first_name,
      va.last_name,
      va.position_text,
      va.organization_text,
      ROW_NUMBER() OVER (PARTITION BY va.document_id ORDER BY va.id ASC) AS rn
    FROM VaskiDocumentActor va
    WHERE va.role_code = 'laatija'
      AND va.document_id IN (SELECT id FROM doc_ids)
  ) ranked
  WHERE ranked.rn = 1
),
source_refs AS (
  SELECT
    ranked.document_id,
    ranked.target_eduskunta_tunnus
  FROM (
    SELECT
      vr.document_id,
      vr.target_eduskunta_tunnus,
      ROW_NUMBER() OVER (PARTITION BY vr.document_id ORDER BY vr.id ASC) AS rn
    FROM VaskiRelationship vr
    WHERE vr.relationship_type = 'vireilletulo'
      AND vr.document_id IN (SELECT id FROM doc_ids)
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
    FROM VaskiSubject ds
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
  vd.document_type_name AS vaski_document_type_name,
  vd.document_type_code AS vaski_document_type_code,
  vd.eduskunta_tunnus AS vaski_eduskunta_tunnus,
  vd.document_number AS vaski_document_number,
  vd.parliamentary_year AS vaski_parliamentary_year,
  vd.title AS vaski_title,
  vd.summary_text AS vaski_summary,
  a.first_name AS vaski_author_first_name,
  a.last_name AS vaski_author_last_name,
  a.position_text AS vaski_author_role,
  a.organization_text AS vaski_author_organization,
  vd.created AS vaski_creation_date,
  vd.status AS vaski_status,
  sr.target_eduskunta_tunnus AS vaski_source_reference,
  sub.vaski_subjects,
  COALESCE(vs.voting_count, 0) AS voting_count,
  COALESCE(sps.speech_count, 0) AS speech_count,
  COALESCE(sps.speaker_count, 0) AS speaker_count,
  COALESCE(sps.party_count, 0) AS party_count
FROM session_sections ss
LEFT JOIN VaskiDocument vd ON vd.id = ss.vaski_id
LEFT JOIN authors a ON a.document_id = vd.id
LEFT JOIN source_refs sr ON sr.document_id = vd.id
LEFT JOIN subjects sub ON sub.document_id = vd.id
LEFT JOIN voting_stats vs ON vs.section_key = ss.key
LEFT JOIN speech_stats sps ON sps.section_key = ss.key
ORDER BY ss.ordinal ASC

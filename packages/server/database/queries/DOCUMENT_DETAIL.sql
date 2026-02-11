WITH doc AS (
  SELECT *
  FROM Document
  WHERE id = $id
),
author AS (
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
    FROM DocumentActor va
    WHERE LOWER(va.role_code) = 'laatija'
      AND va.document_id = $id
  ) ranked
  WHERE ranked.rn = 1
),
source_ref AS (
  SELECT
    ranked.document_id,
    ranked.target_eduskunta_tunnus
  FROM (
    SELECT
      vr.document_id,
      vr.target_tunnus AS target_eduskunta_tunnus,
      ROW_NUMBER() OVER (PARTITION BY vr.document_id ORDER BY vr.id ASC) AS rn
    FROM DocumentRelation vr
    WHERE vr.relation_type = 'vireilletulo'
      AND vr.document_id = $id
  ) ranked
  WHERE ranked.rn = 1
),
subjects AS (
  SELECT
    src.document_id,
    GROUP_CONCAT(src.subject_text) AS subjects
  FROM (
    SELECT DISTINCT
      ds.document_id,
      ds.subject_text
    FROM DocumentSubject ds
    WHERE ds.document_id = $id
  ) src
  GROUP BY src.document_id
)
SELECT
  d.id,
  d.eduskunta_tunnus,
  d.document_type_code,
  d.type_name_fi AS document_type_name,
  d.document_number_text AS document_number,
  d.parliamentary_year_text AS parliamentary_year,
  d.title,
  d.created_at AS created,
  d.status_text AS status,
  d.language_code,
  d.publicity_code,
  NULL AS summary_text,
  sr.target_eduskunta_tunnus AS source_reference,
  a.first_name AS author_first_name,
  a.last_name AS author_last_name,
  a.position_text AS author_role,
  a.organization_text AS author_organization,
  s.subjects
FROM doc d
LEFT JOIN author a ON a.document_id = d.id
LEFT JOIN source_ref sr ON sr.document_id = d.id
LEFT JOIN subjects s ON s.document_id = d.id

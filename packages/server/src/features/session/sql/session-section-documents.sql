WITH section_link_rows AS (
  SELECT
    sdl.id AS source_id,
    sdl.section_key,
    COALESCE(NULLIF(TRIM(sdl.link_text_fi), ''), NULLIF(TRIM(sdl.name_fi), ''), NULLIF(TRIM(sdl.key), ''), sdl.link_url_fi) AS label,
    sdl.link_url_fi AS url,
    NULL AS document_tunnus,
    NULL AS document_id,
    NULL AS document_type_name,
    NULL AS document_type_code,
    NULL AS document_title,
    NULL AS document_created_at,
    'section_link' AS source_type,
    COALESCE(NULLIF(TRIM(sdl.link_url_fi), ''), 'section_link:' || CAST(sdl.id AS TEXT)) AS dedupe_key,
    2 AS source_priority
  FROM SectionDocumentLink sdl
  WHERE sdl.section_key = $sectionKey
    AND sdl.link_url_fi IS NOT NULL
    AND TRIM(sdl.link_url_fi) != ''
),
section_reference_rows AS (
  SELECT
    1000000000 + dr.id AS source_id,
    dr.section_key,
    COALESCE(NULLIF(TRIM(dr.source_text), ''), NULLIF(TRIM(dr.document_tunnus), ''), dr.source_url) AS label,
    dr.source_url AS url,
    dr.document_tunnus,
    NULL AS document_id,
    NULL AS document_type_name,
    NULL AS document_type_code,
    NULL AS document_title,
    NULL AS document_created_at,
    COALESCE(NULLIF(TRIM(dr.source_type), ''), 'section_document') AS source_type,
    COALESCE(
      NULLIF(TRIM(dr.source_url), ''),
      NULLIF(TRIM(dr.document_tunnus), ''),
      'section_document:' || CAST(dr.id AS TEXT)
    ) AS dedupe_key,
    1 AS source_priority
  FROM SaliDBDocumentReference dr
  WHERE dr.section_key = $sectionKey
    AND dr.source_url IS NOT NULL
    AND TRIM(dr.source_url) != ''
),
candidate_rows AS (
  SELECT * FROM section_reference_rows
  UNION ALL
  SELECT * FROM section_link_rows
),
dedupe_priority AS (
  SELECT
    cr.section_key,
    cr.dedupe_key,
    MIN(cr.source_priority) AS source_priority
  FROM candidate_rows cr
  GROUP BY cr.section_key, cr.dedupe_key
),
dedupe_source AS (
  SELECT
    cr.section_key,
    cr.dedupe_key,
    cr.source_priority,
    MIN(cr.source_id) AS min_source_id
  FROM candidate_rows cr
  JOIN dedupe_priority dp
    ON dp.section_key = cr.section_key
   AND dp.dedupe_key = cr.dedupe_key
   AND dp.source_priority = cr.source_priority
  GROUP BY cr.section_key, cr.dedupe_key, cr.source_priority
)
SELECT
  cr.source_id AS id,
  cr.section_key,
  cr.label,
  cr.url,
  cr.document_tunnus,
  cr.document_id,
  cr.document_type_name,
  cr.document_type_code,
  cr.document_title,
  cr.document_created_at,
  cr.source_type
FROM candidate_rows cr
JOIN dedupe_source ds
  ON ds.section_key = cr.section_key
 AND ds.dedupe_key = cr.dedupe_key
 AND ds.source_priority = cr.source_priority
 AND ds.min_source_id = cr.source_id
ORDER BY cr.source_priority ASC, cr.source_id ASC;

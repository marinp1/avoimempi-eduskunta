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
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY
          section_key,
          COALESCE(NULLIF(TRIM(link_url_fi), ''), ''),
          COALESCE(NULLIF(TRIM(link_text_fi), ''), ''),
          COALESCE(NULLIF(TRIM(name_fi), ''), '')
        ORDER BY id ASC
      ) AS rn
    FROM SectionDocumentLink
    WHERE section_key = $sectionKey
      AND link_url_fi IS NOT NULL
      AND TRIM(link_url_fi) != ''
  ) sdl
  WHERE sdl.rn = 1
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
  FROM (
    SELECT
      *,
      ROW_NUMBER() OVER (
        PARTITION BY
          section_key,
          COALESCE(NULLIF(TRIM(document_tunnus), ''), ''),
          COALESCE(NULLIF(TRIM(source_url), ''), ''),
          COALESCE(NULLIF(TRIM(source_text), ''), ''),
          COALESCE(NULLIF(TRIM(source_type), ''), '')
        ORDER BY id ASC
      ) AS rn
    FROM SaliDBDocumentReference
    WHERE section_key = $sectionKey
      AND source_url IS NOT NULL
      AND TRIM(source_url) != ''
  ) dr
  WHERE dr.rn = 1
),
candidate_rows AS (
  SELECT * FROM section_reference_rows
  UNION ALL
  SELECT * FROM section_link_rows
),
ranked_rows AS (
  SELECT
    cr.source_id,
    cr.section_key,
    cr.label,
    cr.url,
    cr.document_tunnus,
    cr.document_id,
    cr.document_type_name,
    cr.document_type_code,
    cr.document_title,
    cr.document_created_at,
    cr.source_type,
    cr.source_priority,
    ROW_NUMBER() OVER (
      PARTITION BY cr.section_key, cr.dedupe_key
      ORDER BY
        cr.source_priority ASC,
        cr.source_id ASC
    ) AS rn
  FROM candidate_rows cr
)
SELECT
  rr.source_id AS id,
  rr.section_key,
  rr.label,
  rr.url,
  rr.document_tunnus,
  rr.document_id,
  rr.document_type_name,
  rr.document_type_code,
  rr.document_title,
  rr.document_created_at,
  rr.source_type
FROM ranked_rows rr
WHERE rr.rn = 1
ORDER BY rr.source_priority ASC, rr.source_id ASC;

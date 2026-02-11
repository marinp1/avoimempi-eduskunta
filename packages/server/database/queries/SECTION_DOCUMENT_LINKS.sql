SELECT
  sdl.id,
  sdl.section_key,
  COALESCE(NULLIF(TRIM(sdl.link_text_fi), ''), NULLIF(TRIM(sdl.name_fi), ''), NULLIF(TRIM(sdl.key), ''), sdl.link_url_fi) AS label,
  sdl.link_url_fi AS url,
  'section_link' AS source_type
FROM SectionDocumentLink sdl
WHERE sdl.section_key = $sectionKey
  AND sdl.link_url_fi IS NOT NULL
  AND TRIM(sdl.link_url_fi) != ''

UNION

SELECT
  1000000000 + dr.id AS id,
  dr.section_key,
  COALESCE(NULLIF(TRIM(dr.source_text), ''), NULLIF(TRIM(dr.document_tunnus), ''), dr.source_url) AS label,
  dr.source_url AS url,
  dr.source_type
FROM SaliDBDocumentReference dr
WHERE dr.section_key = $sectionKey
  AND dr.source_url IS NOT NULL
  AND TRIM(dr.source_url) != ''

ORDER BY id ASC

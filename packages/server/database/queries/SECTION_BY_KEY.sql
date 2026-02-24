SELECT
  sec.key,
  sec.identifier,
  sec.title,
  sec.processing_title,
  sec.note,
  sec.resolution,
  sec.minutes_item_title,
  sec.minutes_content_text
FROM Section sec
WHERE sec.key = $sectionKey
LIMIT 1;

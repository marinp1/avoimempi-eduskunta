SELECT
  sec.key,
  sec.identifier,
  sec.title,
  sec.processing_title,
  sec.note,
  sec.resolution,
  sec.session_key,
  sec.minutes_item_title,
  sec.minutes_item_number,
  sec.minutes_processing_phase_code,
  sec.minutes_related_document_identifier,
  sec.minutes_content_text
FROM Section sec
WHERE sec.key = $sectionKey
LIMIT 1;

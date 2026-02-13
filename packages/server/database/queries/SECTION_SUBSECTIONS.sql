SELECT
  ss.id,
  ss.session_key,
  ss.section_key,
  ss.entry_order,
  ss.entry_kind,
  ss.item_identifier,
  ss.parent_item_identifier,
  ss.item_number,
  ss.item_order,
  ss.item_title,
  ss.related_document_identifier,
  ss.related_document_type,
  ss.processing_phase_code,
  ss.general_processing_phase_code,
  ss.content_text,
  ss.match_mode,
  ss.minutes_document_id
FROM SubSection ss
WHERE ss.section_key = $sectionKey
ORDER BY ss.entry_order ASC, ss.id ASC;

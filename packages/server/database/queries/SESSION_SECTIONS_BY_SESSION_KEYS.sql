WITH session_keys AS (
  SELECT value AS session_key
  FROM json_each($sessionKeysJson)
),
session_sections AS (
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
    sec.minutes_entry_kind,
    sec.minutes_entry_order,
    sec.minutes_item_identifier,
    sec.minutes_parent_item_identifier,
    sec.minutes_item_number,
    sec.minutes_item_order,
    sec.minutes_item_title,
    sec.minutes_related_document_identifier,
    sec.minutes_related_document_type,
    sec.minutes_processing_phase_code,
    sec.minutes_general_processing_phase_code,
    sec.minutes_content_text,
    sec.minutes_match_mode
  FROM Section sec
  WHERE sec.session_key IN (
    SELECT session_key
    FROM session_keys
  )
),
speech_stats AS (
  SELECT
    sp.section_key,
    COUNT(*) AS speech_count,
    COUNT(DISTINCT sp.person_id) AS speaker_count,
    COUNT(DISTINCT CASE WHEN sp.party_abbreviation IS NOT NULL THEN sp.party_abbreviation END) AS party_count
  FROM Speech sp
  JOIN session_sections ss ON ss.key = sp.section_key
  WHERE COALESCE(sp.has_spoken, 1) = 1
  GROUP BY sp.section_key
),
voting_stats AS (
  SELECT
    v.section_key,
    COUNT(*) AS voting_count
  FROM Voting v
  JOIN session_sections ss ON ss.key = v.section_key
  GROUP BY v.section_key
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
  ss.minutes_entry_kind,
  ss.minutes_entry_order,
  ss.minutes_item_identifier,
  ss.minutes_parent_item_identifier,
  ss.minutes_item_number,
  ss.minutes_item_order,
  ss.minutes_item_title,
  ss.minutes_related_document_identifier,
  ss.minutes_related_document_type,
  ss.minutes_processing_phase_code,
  ss.minutes_general_processing_phase_code,
  ss.minutes_content_text,
  ss.minutes_match_mode,
  NULL AS vaski_document_id,
  NULL AS vaski_document_type_name,
  NULL AS vaski_document_type_code,
  NULL AS vaski_eduskunta_tunnus,
  NULL AS vaski_document_number,
  NULL AS vaski_parliamentary_year,
  NULL AS vaski_title,
  NULL AS vaski_summary,
  NULL AS vaski_author_first_name,
  NULL AS vaski_author_last_name,
  NULL AS vaski_author_role,
  NULL AS vaski_author_organization,
  NULL AS vaski_creation_date,
  NULL AS vaski_status,
  NULL AS vaski_source_reference,
  NULL AS vaski_subjects,
  COALESCE(vs.voting_count, 0) AS voting_count,
  COALESCE(sps.speech_count, 0) AS speech_count,
  COALESCE(sps.speaker_count, 0) AS speaker_count,
  COALESCE(sps.party_count, 0) AS party_count
FROM session_sections ss
LEFT JOIN voting_stats vs ON vs.section_key = ss.key
LEFT JOIN speech_stats sps ON sps.section_key = ss.key
ORDER BY ss.ordinal ASC

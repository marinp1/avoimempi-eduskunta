SELECT
    sp.id,
    NULL AS excel_id,
    sec.processing_title AS processing_phase,
    COALESCE(sec.identifier, sec.title, sec.processing_title, sp.section_key) AS document,
    sp.ordinal,
    sp.ministry AS position,
    sp.first_name,
    sp.last_name,
    sp.party_abbreviation AS party,
    sp.speech_type,
    COALESCE(sp.request_time, sp.modified_datetime) AS start_time,
    NULL AS end_time,
    NULL AS content,
    NULL AS minutes_url,
    NULL AS source_file,
    sec.title as section_title,
    sec.processing_title as section_processing_title,
    sec.ordinal as section_ordinal
FROM
    Speech sp
LEFT JOIN
    Section sec ON sp.section_key = sec.key
JOIN
    Session s ON sp.session_key = s.key
WHERE
    s.date = $date
    AND COALESCE(sp.has_spoken, 1) = 1
ORDER BY
    COALESCE(sp.request_time, sp.modified_datetime) ASC,
    sec.key ASC,
    sp.ordinal ASC

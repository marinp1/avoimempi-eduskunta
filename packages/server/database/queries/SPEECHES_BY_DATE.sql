SELECT
    sp.id,
    vms.link_key AS excel_id,
    sec.processing_title AS processing_phase,
    COALESCE(sec.identifier, sec.title, sec.processing_title, sp.section_key) AS document,
    sp.ordinal,
    sp.ministry AS position,
    sp.first_name,
    sp.last_name,
    sp.party_abbreviation AS party,
    sp.speech_type,
    vms.start_time,
    vms.end_time,
    vms.content,
    NULL AS minutes_url,
    NULL AS source_file,
    sec.title as section_title,
    sec.processing_title as section_processing_title,
    sec.ordinal as section_ordinal
FROM
    Speech sp
LEFT JOIN
    VaskiMinutesSpeech vms ON sp.excel_key = vms.link_key COLLATE NOCASE
LEFT JOIN
    Section sec ON sp.section_key = sec.key
LEFT JOIN
    Session s ON sp.session_key = s.key
WHERE
    s.date = $date
ORDER BY
    vms.start_time ASC,
    sec.key ASC,
    sp.ordinal ASC

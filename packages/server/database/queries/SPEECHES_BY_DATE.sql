SELECT
    es.id,
    es.excel_id,
    es.processing_phase,
    es.document,
    es.ordinal,
    es.position,
    es.first_name,
    es.last_name,
    es.party,
    es.speech_type,
    es.start_time,
    es.end_time,
    es.content,
    es.minutes_url,
    es.source_file,
    sec.title as section_title,
    sec.processing_title as section_processing_title,
    sec.ordinal as section_ordinal
FROM
    ExcelSpeech es
LEFT JOIN
    Section sec ON es.document = sec.agenda_key COLLATE NOCASE
LEFT JOIN
    Session s ON sec.session_key = s.key
WHERE
    s.date = $date
ORDER BY
    es.start_time ASC,
    es.document ASC,
    es.processing_phase ASC,
    es.ordinal ASC

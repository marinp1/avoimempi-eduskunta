SELECT
    sp.id,
    sp.key,
    sp.session_key,
    sp.section_key,
    sp.ordinal,
    sp.ordinal_number,
    sp.speech_type,
    sp.request_method,
    sp.request_time,
    sp.person_id,
    sp.first_name,
    sp.last_name,
    sp.gender,
    sp.party_abbreviation,
    sp.has_spoken,
    sp.ministry,
    sp.modified_datetime,
    sp.excel_key,
    es.content,
    es.start_time,
    es.end_time,
    es.minutes_url
FROM
    Speech sp
LEFT JOIN
    ExcelSpeech es ON sp.excel_key = es.excel_id
WHERE
    sp.section_key = $sectionKey
ORDER BY sp.ordinal ASC
LIMIT $limit OFFSET $offset

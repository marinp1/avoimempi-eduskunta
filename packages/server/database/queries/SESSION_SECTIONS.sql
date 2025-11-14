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
    sec.vaski_id
FROM
    Section sec
WHERE
    sec.session_key = $sessionKey
ORDER BY sec.ordinal ASC

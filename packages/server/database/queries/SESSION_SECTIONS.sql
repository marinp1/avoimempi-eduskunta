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
    vd.document_type_name AS vaski_document_type_name,
    vd.document_type_code AS vaski_document_type_code,
    vd.eduskunta_tunnus AS vaski_eduskunta_tunnus,
    vd.document_number AS vaski_document_number,
    vd.parliamentary_year AS vaski_parliamentary_year,
    vd.title AS vaski_title,
    vd.summary AS vaski_summary,
    vd.author_first_name AS vaski_author_first_name,
    vd.author_last_name AS vaski_author_last_name,
    vd.author_role AS vaski_author_role,
    vd.author_organization AS vaski_author_organization,
    vd.creation_date AS vaski_creation_date,
    vd.status AS vaski_status,
    vd.source_reference AS vaski_source_reference,
    (SELECT group_concat(DISTINCT ds.subject_text, ' | ')
     FROM DocumentSubject ds
     WHERE ds.document_id = vd.id) AS vaski_subjects,
    (SELECT COUNT(*) FROM Voting v WHERE v.section_key = sec.key) AS voting_count,
    (SELECT COUNT(*) FROM Speech sp WHERE sp.section_key = sec.key) AS speech_count,
    (SELECT COUNT(DISTINCT sp.person_id) FROM Speech sp WHERE sp.section_key = sec.key) AS speaker_count,
    (SELECT COUNT(DISTINCT sp.party_abbreviation) FROM Speech sp WHERE sp.section_key = sec.key AND sp.party_abbreviation IS NOT NULL) AS party_count
FROM
    Section sec
    LEFT JOIN VaskiDocument vd ON vd.id = sec.vaski_id
WHERE
    sec.session_key = $sessionKey
ORDER BY sec.ordinal ASC
